const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const createDemoUsers = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing users
    await User.deleteMany({});
    console.log('🗑️ Cleared existing users');

    // Create admin user
    const adminUser = new User({
      firstName: "Admin",
      lastName: "User", 
      email: "admin@example.com",
      password: "password123",
      role: "admin",
      phone: "9876543210",
      isActive: true,
      emailVerified: true
    });
    await adminUser.save();
    console.log('✅ Admin user created: admin@example.com');

    // Create customer user
    const customerUser = new User({
      firstName: "Customer",
      lastName: "User",
      email: "customer@example.com", 
      password: "password123",
      role: "customer",
      phone: "9876543211",
      isActive: true,
      emailVerified: true
    });
    await customerUser.save();
    console.log('✅ Customer user created: customer@example.com');

    console.log('\n🎉 Demo users created successfully!');
    console.log('Demo credentials:');
    console.log('👑 Admin: admin@example.com / password123');
    console.log('👤 Customer: customer@example.com / password123');

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating demo users:', error);
    process.exit(1);
  }
};

createDemoUsers();
