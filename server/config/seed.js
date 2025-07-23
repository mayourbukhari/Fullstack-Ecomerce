const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/Product');
const User = require('../models/User');

// Load environment variables
dotenv.config();

// Sample product data
const sampleProducts = [
  {
    name: "Elegant Banarasi Silk Saree",
    description: "Beautiful traditional Banarasi silk saree with intricate golden zari work. Perfect for weddings and special occasions. The rich texture and lustrous finish make it a timeless piece for your wardrobe.",
    price: 12500,
    originalPrice: 15000,
    category: "Silk Sarees",
    fabric: "Banarasi",
    color: "Royal Blue",
    occasion: "Wedding",
    sizes: ["Free Size"],
    stock: 25,
    images: [
      {
        url: "https://res.cloudinary.com/demo/image/upload/v1/saree-store/banarasi-blue-1.jpg",
        public_id: "saree-store/banarasi-blue-1"
      },
      {
        url: "https://res.cloudinary.com/demo/image/upload/v1/saree-store/banarasi-blue-2.jpg",
        public_id: "saree-store/banarasi-blue-2"
      }
    ],
    isFeatured: true,
    tags: ["banarasi", "silk", "wedding", "traditional", "zari"],
    sku: "BSS001",
    weight: 800
  },
  {
    name: "Pure Kanjivaram Silk Saree",
    description: "Authentic Kanjivaram silk saree with traditional temple border. Handwoven by skilled artisans in Tamil Nadu. The rich maroon color with golden motifs represents the epitome of South Indian craftsmanship.",
    price: 18500,
    originalPrice: 22000,
    category: "Silk Sarees",
    fabric: "Kanjivaram",
    color: "Maroon",
    occasion: "Festival",
    sizes: ["Free Size"],
    stock: 15,
    images: [
      {
        url: "https://res.cloudinary.com/demo/image/upload/v1/saree-store/kanjivaram-maroon-1.jpg",
        public_id: "saree-store/kanjivaram-maroon-1"
      },
      {
        url: "https://res.cloudinary.com/demo/image/upload/v1/saree-store/kanjivaram-maroon-2.jpg",
        public_id: "saree-store/kanjivaram-maroon-2"
      }
    ],
    isFeatured: true,
    tags: ["kanjivaram", "silk", "handwoven", "temple border", "traditional"],
    sku: "KSS002",
    weight: 750
  },
  {
    name: "Designer Georgette Party Wear Saree",
    description: "Contemporary designer saree in flowing georgette fabric with embellished blouse. Perfect for cocktail parties and modern celebrations. The lightweight fabric ensures comfort while maintaining elegance.",
    price: 4500,
    originalPrice: 6000,
    category: "Designer Sarees",
    fabric: "Georgette",
    color: "Emerald Green",
    occasion: "Party",
    sizes: ["Free Size"],
    stock: 40,
    images: [
      {
        url: "https://res.cloudinary.com/demo/image/upload/v1/saree-store/georgette-green-1.jpg",
        public_id: "saree-store/georgette-green-1"
      },
      {
        url: "https://res.cloudinary.com/demo/image/upload/v1/saree-store/georgette-green-2.jpg",
        public_id: "saree-store/georgette-green-2"
      }
    ],
    isFeatured: false,
    tags: ["georgette", "designer", "party wear", "embellished", "modern"],
    sku: "DGS003",
    weight: 450
  },
  {
    name: "Handloom Cotton Saree",
    description: "Comfortable and breathable handloom cotton saree perfect for daily wear. The simple yet elegant design with traditional motifs makes it ideal for office and casual occasions.",
    price: 1800,
    originalPrice: 2200,
    category: "Cotton Sarees",
    fabric: "Cotton",
    color: "Cream",
    occasion: "Casual",
    sizes: ["Free Size"],
    stock: 60,
    images: [
      {
        url: "https://res.cloudinary.com/demo/image/upload/v1/saree-store/cotton-cream-1.jpg",
        public_id: "saree-store/cotton-cream-1"
      },
      {
        url: "https://res.cloudinary.com/demo/image/upload/v1/saree-store/cotton-cream-2.jpg",
        public_id: "saree-store/cotton-cream-2"
      }
    ],
    isFeatured: false,
    tags: ["cotton", "handloom", "casual", "breathable", "daily wear"],
    sku: "HCS004",
    weight: 500
  },
  {
    name: "Heavy Bridal Lehenga Saree",
    description: "Exquisite bridal lehenga saree with heavy embroidery and stone work. Crafted for the modern bride who wants to make a statement. Includes matching dupatta and designer blouse.",
    price: 35000,
    originalPrice: 42000,
    category: "Wedding Sarees",
    fabric: "Net",
    color: "Deep Red",
    occasion: "Wedding",
    sizes: ["Free Size"],
    stock: 8,
    images: [
      {
        url: "https://res.cloudinary.com/demo/image/upload/v1/saree-store/bridal-red-1.jpg",
        public_id: "saree-store/bridal-red-1"
      },
      {
        url: "https://res.cloudinary.com/demo/image/upload/v1/saree-store/bridal-red-2.jpg",
        public_id: "saree-store/bridal-red-2"
      }
    ],
    isFeatured: true,
    tags: ["bridal", "heavy work", "embroidery", "stones", "lehenga style"],
    sku: "BLS005",
    weight: 1200
  },
  {
    name: "Tussar Silk Printed Saree",
    description: "Light and airy Tussar silk saree with beautiful printed patterns. Perfect for summer occasions and festivals. The natural texture of Tussar silk gives it a unique appeal.",
    price: 3200,
    originalPrice: 4000,
    category: "Silk Sarees",
    fabric: "Tussar",
    color: "Yellow",
    occasion: "Festival",
    sizes: ["Free Size"],
    stock: 30,
    images: [
      {
        url: "https://res.cloudinary.com/demo/image/upload/v1/saree-store/tussar-yellow-1.jpg",
        public_id: "saree-store/tussar-yellow-1"
      },
      {
        url: "https://res.cloudinary.com/demo/image/upload/v1/saree-store/tussar-yellow-2.jpg",
        public_id: "saree-store/tussar-yellow-2"
      }
    ],
    isFeatured: false,
    tags: ["tussar", "printed", "lightweight", "summer", "festival"],
    sku: "TSS006",
    weight: 400
  }
];

// Sample users to match demo credentials in login form
const adminUser = {
  firstName: "Admin",
  lastName: "User",
  email: "admin@example.com",
  password: "password123",
  role: "admin",
  phone: "9876543210",
  isActive: true,
  emailVerified: true
};

const customerUser = {
  firstName: "Customer",
  lastName: "User",
  email: "customer@example.com", 
  password: "password123",
  role: "customer",
  phone: "9876543211",
  isActive: true,
  emailVerified: true
};

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Clear existing data
    await Product.deleteMany({});
    await User.deleteMany({});

    console.log('Cleared existing data');

    // Create admin user
    const admin = new User(adminUser);
    await admin.save();
    console.log('Admin user created');

    // Create customer user  
    const customer = new User(customerUser);
    await customer.save();
    console.log('Customer user created');

    // Create products
    await Product.insertMany(sampleProducts);
    console.log('Sample products created');

    console.log('Database seeded successfully!');
    console.log(`Created ${sampleProducts.length} products`);
    console.log('Demo credentials:');
    console.log('Admin: admin@example.com / password123');
    console.log('Customer: customer@example.com / password123');

    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

// Run seeding
seedDatabase();
