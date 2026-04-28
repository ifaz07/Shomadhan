const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User.model');

const checkUsers = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB...');

    const users = await User.find({}).select('email role isActive isVerified');
    
    if (users.length === 0) {
      console.log('❌ No users found in the database.');
    } else {
      console.log(`\nFound ${users.length} users:`);
      users.forEach(u => {
        console.log(`- Email: "${u.email}" | Role: ${u.role} | Active: ${u.isActive} | Verified: ${u.isVerified}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkUsers();
