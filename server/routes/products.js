const express = require('express');
const multer = require('multer');
const { query, param, body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const { protect, admin, optionalAuth } = require('../middleware/authMiddleware');
const { uploadImage, deleteImage, uploadMultipleImages } = require('../config/cloudinary');

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// @desc    Get all products with filtering, sorting, and pagination
// @route   GET /api/products
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Minimum price must be a positive number'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Maximum price must be a positive number')
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Build filter object
    let filter = { isActive: true };

    // Category filter
    if (req.query.category) {
      filter.category = { $in: req.query.category.split(',') };
    }

    // Fabric filter
    if (req.query.fabric) {
      filter.fabric = { $in: req.query.fabric.split(',') };
    }

    // Color filter
    if (req.query.color) {
      filter.color = { $in: req.query.color.split(',') };
    }

    // Occasion filter
    if (req.query.occasion) {
      filter.occasion = { $in: req.query.occasion.split(',') };
    }

    // Price range filter
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = parseFloat(req.query.maxPrice);
    }

    // Search filter
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    // Featured filter
    if (req.query.featured === 'true') {
      filter.isFeatured = true;
    }

    // In stock filter
    if (req.query.inStock === 'true') {
      filter.stock = { $gt: 0 };
    }

    // Build sort object
    let sort = {};
    switch (req.query.sortBy) {
      case 'price_asc':
        sort.price = 1;
        break;
      case 'price_desc':
        sort.price = -1;
        break;
      case 'name_asc':
        sort.name = 1;
        break;
      case 'name_desc':
        sort.name = -1;
        break;
      case 'rating':
        sort['ratings.average'] = -1;
        break;
      case 'newest':
        sort.createdAt = -1;
        break;
      case 'oldest':
        sort.createdAt = 1;
        break;
      default:
        sort.createdAt = -1; // Default to newest first
    }

    // Execute query
    const products = await Product.find(filter)
      .select('-reviews') // Exclude reviews for better performance
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Product.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: page,
          totalPages,
          totalProducts: total,
          hasNextPage,
          hasPrevPage,
          limit
        }
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products'
    });
  }
});

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;

    const products = await Product.find({ 
      isFeatured: true, 
      isActive: true, 
      stock: { $gt: 0 } 
    })
    .select('-reviews')
    .sort({ createdAt: -1 })
    .limit(limit);

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured products'
    });
  }
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid product ID')
], optionalAuth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const product = await Product.findById(req.params.id)
      .populate('reviews.user', 'firstName lastName avatar');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if product is in user's wishlist (if user is logged in)
    let isInWishlist = false;
    if (req.user) {
      isInWishlist = req.user.wishlist.includes(product._id);
    }

    res.json({
      success: true,
      data: {
        ...product.toJSON(),
        isInWishlist
      }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product'
    });
  }
});

// @desc    Create new product (Admin only)
// @route   POST /api/products
// @access  Private/Admin
router.post('/', protect, admin, upload.array('images', 10), [
  body('name').notEmpty().withMessage('Product name is required'),
  body('description').notEmpty().withMessage('Product description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').notEmpty().withMessage('Category is required'),
  body('fabric').notEmpty().withMessage('Fabric is required'),
  body('color').notEmpty().withMessage('Color is required'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer')
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

    let productData = { ...req.body };

    // Parse sizes if it's a string (from FormData)
    if (typeof productData.sizes === 'string') {
      try {
        productData.sizes = JSON.parse(productData.sizes);
      } catch (error) {
        productData.sizes = [];
      }
    }

    // Parse tags if provided
    if (productData.tags && typeof productData.tags === 'string') {
      productData.tags = productData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    // Generate SKU if not provided
    if (!productData.sku) {
      const categoryCode = productData.category.substring(0, 3).toUpperCase();
      const count = await Product.countDocuments();
      productData.sku = `${categoryCode}${(count + 1).toString().padStart(3, '0')}`;
    }

    // Handle image uploads
    let images = [];
    if (req.files && req.files.length > 0) {
      try {
        console.log('Attempting to upload', req.files.length, 'files to Cloudinary');
        // Convert buffer to base64 for cloudinary upload
        const uploadPromises = req.files.map(file => {
          console.log('Uploading file:', file.originalname, 'Size:', file.size, 'Type:', file.mimetype);
          const base64Data = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
          return uploadImage(base64Data, 'saree-store/products');
        });
        
        images = await Promise.all(uploadPromises);
        console.log('Successfully uploaded images:', images.length);
      } catch (uploadError) {
        console.error('Image upload error details:', uploadError);
        console.error('Cloudinary config check:', {
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret_exists: !!process.env.CLOUDINARY_API_SECRET
        });
        return res.status(500).json({
          success: false,
          message: 'Error uploading images to Cloudinary. Please check Cloudinary configuration.',
          error: uploadError.message
        });
      }
    } else {
      console.log('No files uploaded, creating product without images');
    }

    productData.images = images;
    console.log('Creating product with data:', { ...productData, images: images.length });

    const product = await Product.create(productData);
    console.log('Product created successfully:', product._id);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('Create product error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    console.error('Request files:', req.files ? req.files.length : 'none');
    
    // Check if it's a validation error
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.message,
        details: error.errors
      });
    }
    
    // Check if it's a MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate key error. SKU already exists.',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @desc    Update product (Admin only)
// @route   PUT /api/products/:id
// @access  Private/Admin
router.put('/:id', protect, admin, upload.array('images', 10), [
  param('id').isMongoId().withMessage('Invalid product ID'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer')
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

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    let productData = { ...req.body };

    // Parse sizes if it's a string (from FormData)
    if (typeof productData.sizes === 'string') {
      try {
        productData.sizes = JSON.parse(productData.sizes);
      } catch (error) {
        productData.sizes = product.sizes; // Keep existing sizes if parsing fails
      }
    }

    // Parse tags if provided
    if (productData.tags && typeof productData.tags === 'string') {
      productData.tags = productData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    // Handle existing images
    let existingImages = product.images || [];
    if (productData.existingImages) {
      try {
        const keepImages = JSON.parse(productData.existingImages);
        existingImages = existingImages.filter(img => 
          keepImages.some(keepImg => keepImg.public_id === img.public_id)
        );
      } catch (error) {
        console.error('Error parsing existing images:', error);
      }
    }

    // Handle new image uploads
    let newImages = [];
    if (req.files && req.files.length > 0) {
      try {
        // Convert buffer to base64 for cloudinary upload
        const uploadPromises = req.files.map(file => {
          const base64Data = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
          return uploadImage(base64Data, 'saree-store/products');
        });
        
        newImages = await Promise.all(uploadPromises);
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Error uploading new images'
        });
      }
    }

    // Combine existing and new images
    productData.images = [...existingImages, ...newImages];

    // Remove existingImages from productData as it's not a model field
    delete productData.existingImages;

    // Update product
    Object.assign(product, productData);
    const updatedProduct = await product.save();

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error.message
    });
  }
});

// @desc    Delete product (Admin only)
// @route   DELETE /api/products/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, [
  param('id').isMongoId().withMessage('Invalid product ID')
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

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete product images from Cloudinary
    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        if (image.public_id) {
          await deleteImage(image.public_id);
        }
      }
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product'
    });
  }
});

// @desc    Add product review
// @route   POST /api/products/:id/reviews
// @access  Private
router.post('/:id/reviews', protect, [
  param('id').isMongoId().withMessage('Invalid product ID'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').notEmpty().withMessage('Comment is required')
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

    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user has already reviewed this product
    const existingReview = product.reviews.find(
      (review) => review.user.toString() === req.user._id.toString()
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    // Add review
    const review = {
      user: req.user._id,
      name: req.user.fullName,
      rating,
      comment
    };

    product.reviews.push(review);
    await product.save();

    res.status(201).json({
      success: true,
      message: 'Review added successfully'
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding review'
    });
  }
});

// @desc    Get product categories, fabrics, colors for filters
// @route   GET /api/products/filters/options
// @access  Public
router.get('/filters/options', async (req, res) => {
  try {
    const categories = await Product.distinct('category', { isActive: true });
    const fabrics = await Product.distinct('fabric', { isActive: true });
    const colors = await Product.distinct('color', { isActive: true });
    const occasions = await Product.distinct('occasion', { isActive: true });

    // Get price range
    const priceRange = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        categories: categories.filter(Boolean),
        fabrics: fabrics.filter(Boolean),
        colors: colors.filter(Boolean),
        occasions: occasions.filter(Boolean),
        priceRange: priceRange[0] || { minPrice: 0, maxPrice: 50000 }
      }
    });
  } catch (error) {
    console.error('Get filter options error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching filter options'
    });
  }
});

module.exports = router;
