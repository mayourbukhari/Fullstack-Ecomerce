const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  originalPrice: {
    type: Number,
    default: function() { return this.price; }
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: ['Silk Sarees', 'Cotton Sarees', 'Designer Sarees', 'Wedding Sarees', 'Casual Sarees', 'Party Wear', 'Traditional', 'Contemporary']
  },
  fabric: {
    type: String,
    required: [true, 'Fabric type is required'],
    enum: ['Silk', 'Cotton', 'Georgette', 'Chiffon', 'Net', 'Crepe', 'Banarasi', 'Kanjivaram', 'Tussar', 'Art Silk']
  },
  color: {
    type: String,
    required: [true, 'Color is required']
  },
  occasion: {
    type: String,
    enum: ['Wedding', 'Festival', 'Party', 'Casual', 'Office', 'Traditional', 'Formal']
  },
  sizes: [{
    type: String,
    enum: ['Free Size', 'XS', 'S', 'M', 'L', 'XL', 'XXL']
  }],
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    public_id: {
      type: String,
      required: true
    }
  }],
  isFeatured: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  ratings: {
    average: {
      type: Number,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [String],
  sku: {
    type: String,
    unique: true,
    sparse: true
  },
  weight: Number,
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  }
}, {
  timestamps: true
});

// Index for search functionality
productSchema.index({ 
  name: 'text', 
  description: 'text', 
  category: 'text', 
  fabric: 'text', 
  color: 'text' 
});

// Index for filtering
productSchema.index({ category: 1, fabric: 1, price: 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });

// Calculate average rating
productSchema.methods.calculateAverageRating = function() {
  if (this.reviews.length === 0) {
    this.ratings.average = 0;
    this.ratings.count = 0;
  } else {
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.ratings.average = totalRating / this.reviews.length;
    this.ratings.count = this.reviews.length;
  }
};

// Pre-save middleware to calculate average rating
productSchema.pre('save', function(next) {
  this.calculateAverageRating();
  next();
});

module.exports = mongoose.model('Product', productSchema);
