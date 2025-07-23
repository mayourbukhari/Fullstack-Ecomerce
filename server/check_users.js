const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const checkUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sara_collection');
    console.log('Connected to database');
    
    const users = await User.find({}, 'email role firstName lastName');
    console.log('Existing users:', users);
    
    await mongoose.disconnect();
    console.log('Disconnected from database');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

checkUsers();
