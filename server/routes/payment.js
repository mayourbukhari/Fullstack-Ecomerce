const express = require('express');
const { body, validationResult } = require('express-validator');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// @desc    Create Razorpay order
// @route   POST /api/payment/razorpay/create-order
// @access  Private
router.post('/razorpay/create-order', protect, [
  body('amount').isInt({ min: 1 }).withMessage('Amount must be a positive integer'),
  body('currency').optional().equals('INR').withMessage('Currency must be INR')
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

    const { amount, currency = 'INR' } = req.body;

    const options = {
      amount: amount * 100, // Amount in paise
      currency,
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    console.error('Razorpay create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment order'
    });
  }
});

// @desc    Verify Razorpay payment
// @route   POST /api/payment/razorpay/verify
// @access  Private
router.post('/razorpay/verify', protect, [
  body('razorpay_order_id').notEmpty().withMessage('Razorpay order ID is required'),
  body('razorpay_payment_id').notEmpty().withMessage('Razorpay payment ID is required'),
  body('razorpay_signature').notEmpty().withMessage('Razorpay signature is required'),
  body('orderId').isMongoId().withMessage('Invalid order ID')
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

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId
    } = req.body;

    // Verify signature
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generated_signature = hmac.digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    // Update order with payment info
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    order.paymentInfo = {
      ...order.paymentInfo,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      signature: razorpay_signature,
      status: 'completed',
      paidAt: new Date()
    };
    order.status = 'confirmed';

    await order.save();

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentInfo.status
      }
    });
  } catch (error) {
    console.error('Razorpay verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment'
    });
  }
});

// @desc    Handle Razorpay webhook
// @route   POST /api/payment/razorpay/webhook
// @access  Public
router.post('/razorpay/webhook', async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const webhookBody = JSON.stringify(req.body);

    if (webhookSecret) {
      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(webhookBody);
      const generated_signature = hmac.digest('hex');

      if (generated_signature !== webhookSignature) {
        return res.status(400).json({
          success: false,
          message: 'Webhook signature verification failed'
        });
      }
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload.payment.entity;

    switch (event) {
      case 'payment.captured':
        // Payment was successful
        console.log('Payment captured:', paymentEntity.id);
        break;

      case 'payment.failed':
        // Payment failed
        console.log('Payment failed:', paymentEntity.id);
        // Update order status to failed
        const failedOrder = await Order.findOne({
          'paymentInfo.orderId': paymentEntity.order_id
        });
        if (failedOrder) {
          failedOrder.paymentInfo.status = 'failed';
          failedOrder.paymentInfo.failureReason = paymentEntity.error_description;
          await failedOrder.save();
        }
        break;

      default:
        console.log('Unhandled webhook event:', event);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Razorpay webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing webhook'
    });
  }
});

// @desc    Create payment intent for Stripe
// @route   POST /api/payment/stripe/create-intent
// @access  Private
router.post('/stripe/create-intent', protect, [
  body('amount').isInt({ min: 1 }).withMessage('Amount must be a positive integer'),
  body('currency').optional().equals('inr').withMessage('Currency must be INR')
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

    // Note: Stripe integration would require the Stripe SDK
    // This is a placeholder implementation
    const { amount, currency = 'inr' } = req.body;

    res.json({
      success: true,
      message: 'Stripe integration coming soon',
      data: {
        amount,
        currency,
        client_secret: 'stripe_client_secret_placeholder'
      }
    });
  } catch (error) {
    console.error('Stripe create intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment intent'
    });
  }
});

// @desc    Process COD order
// @route   POST /api/payment/cod/process
// @access  Private
router.post('/cod/process', protect, [
  body('orderId').isMongoId().withMessage('Invalid order ID')
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

    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (order.paymentInfo.method !== 'cod') {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method for this order'
      });
    }

    // Update order status for COD
    order.status = 'confirmed';
    order.paymentInfo.status = 'pending'; // Will be completed on delivery

    await order.save();

    res.json({
      success: true,
      message: 'COD order processed successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status
      }
    });
  } catch (error) {
    console.error('COD process error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing COD order'
    });
  }
});

module.exports = router;
