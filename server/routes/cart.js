const express = require('express');
const { body, param, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('cart.product', 'name price images stock isActive')
      .select('cart');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Filter out inactive products and calculate totals
    const activeCartItems = user.cart.filter(item => 
      item.product && item.product.isActive && item.product.stock > 0
    );

    const cartTotal = activeCartItems.reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0);

    const totalItems = activeCartItems.reduce((total, item) => {
      return total + item.quantity;
    }, 0);

    res.json({
      success: true,
      data: {
        items: activeCartItems,
        summary: {
          totalItems,
          subtotal: cartTotal,
          total: cartTotal
        }
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cart'
    });
  }
});

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Private
router.post('/add', protect, [
  body('productId').isMongoId().withMessage('Invalid product ID'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('size').optional().notEmpty().withMessage('Size cannot be empty if provided')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { productId, quantity, size } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if product exists and is active
    const Product = require('../models/Product');
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (!product.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Product is not available'
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} items available in stock`
      });
    }

    // Check if item already exists in cart
    const existingItemIndex = user.cart.findIndex(
      item => item.product.toString() === productId && item.size === size
    );

    if (existingItemIndex !== -1) {
      // Update quantity of existing item
      const newQuantity = user.cart[existingItemIndex].quantity + quantity;
      
      if (newQuantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stock} items available in stock`
        });
      }

      user.cart[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item to cart
      user.cart.push({
        product: productId,
        quantity,
        size: size || undefined
      });
    }

    await user.save();

    // Populate cart for response
    await user.populate('cart.product', 'name price images stock');

    res.json({
      success: true,
      message: 'Item added to cart successfully',
      data: user.cart
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding item to cart'
    });
  }
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/update/:itemId
// @access  Private
router.put('/update/:itemId', protect, [
  param('itemId').isMongoId().withMessage('Invalid item ID'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { quantity } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const cartItem = user.cart.id(req.params.itemId);

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    if (quantity === 0) {
      // Remove item from cart
      cartItem.remove();
    } else {
      // Check stock availability
      const Product = require('../models/Product');
      const product = await Product.findById(cartItem.product);

      if (!product || !product.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Product is not available'
        });
      }

      if (quantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stock} items available in stock`
        });
      }

      cartItem.quantity = quantity;
    }

    await user.save();

    // Populate cart for response
    await user.populate('cart.product', 'name price images stock');

    res.json({
      success: true,
      message: 'Cart updated successfully',
      data: user.cart
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating cart'
    });
  }
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove/:itemId
// @access  Private
router.delete('/remove/:itemId', protect, [
  param('itemId').isMongoId().withMessage('Invalid item ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const cartItem = user.cart.id(req.params.itemId);

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found'
      });
    }

    cartItem.remove();
    await user.save();

    res.json({
      success: true,
      message: 'Item removed from cart successfully'
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing item from cart'
    });
  }
});

// @desc    Clear entire cart
// @route   DELETE /api/cart/clear
// @access  Private
router.delete('/clear', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.cart = [];
    await user.save();

    res.json({
      success: true,
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing cart'
    });
  }
});

// @desc    Sync cart with local storage
// @route   POST /api/cart/sync
// @access  Private
router.post('/sync', protect, [
  body('cartItems').isArray().withMessage('Cart items must be an array'),
  body('cartItems.*.productId').isMongoId().withMessage('Invalid product ID'),
  body('cartItems.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { cartItems } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate all products exist and are active
    const Product = require('../models/Product');
    const productIds = cartItems.map(item => item.productId);
    const products = await Product.find({
      _id: { $in: productIds },
      isActive: true
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some products are not available'
      });
    }

    // Merge with existing cart
    const existingCart = user.cart;
    const newCart = [];

    // Add items from local storage
    for (const item of cartItems) {
      const product = products.find(p => p._id.toString() === item.productId);
      
      if (product && item.quantity <= product.stock) {
        // Check if item already exists in server cart
        const existingItem = existingCart.find(
          cartItem => cartItem.product.toString() === item.productId && 
                     cartItem.size === item.size
        );

        if (existingItem) {
          // Use the maximum quantity
          const maxQuantity = Math.min(
            Math.max(existingItem.quantity, item.quantity),
            product.stock
          );
          newCart.push({
            product: item.productId,
            quantity: maxQuantity,
            size: item.size
          });
        } else {
          newCart.push({
            product: item.productId,
            quantity: Math.min(item.quantity, product.stock),
            size: item.size
          });
        }
      }
    }

    // Add existing server items that weren't in local storage
    for (const existingItem of existingCart) {
      const localItem = cartItems.find(
        item => item.productId === existingItem.product.toString() && 
               item.size === existingItem.size
      );

      if (!localItem) {
        newCart.push(existingItem);
      }
    }

    user.cart = newCart;
    await user.save();

    // Populate cart for response
    await user.populate('cart.product', 'name price images stock');

    res.json({
      success: true,
      message: 'Cart synced successfully',
      data: user.cart
    });
  } catch (error) {
    console.error('Sync cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Error syncing cart'
    });
  }
});

module.exports = router;
