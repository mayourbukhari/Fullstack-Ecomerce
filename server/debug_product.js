const mongoose = require('mongoose');
const Product = require('./models/Product');

mongoose.connect('mongodb://localhost:27017/saree_store')
  .then(async () => {
    console.log('Connected to MongoDB');
    const productId = '6877e6121bd62721918c0da6';
    const product = await Product.findById(productId);
    console.log('Product found:', !!product);
    if (product) {
      console.log('Product details:', { 
        name: product.name, 
        stock: product.stock, 
        isActive: product.isActive,
        price: product.price
      });
    } else {
      console.log('Product not found with ID:', productId);
      const allProducts = await Product.find({}, { _id: 1, name: 1, stock: 1, isActive: 1 }).limit(5);
      console.log('Available products (first 5):', allProducts);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Database error:', err.message);
    process.exit(1);
  });
