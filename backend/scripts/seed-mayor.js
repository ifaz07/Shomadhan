const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('../models/User.model');

const seedMayor = async () => {
  try {
    // 1. Connect to your database using your .env URI
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('❌ MONGODB_URI not found in .env file');
      process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB...');

    const mayorEmail = 'mayor@shomadhan.com';
    const mayorPassword = 'mayor123';

    // 2. Check if mayor already exists
    const existingMayor = await User.findOne({ email: mayorEmail });
    if (existingMayor) {
      console.log('ℹ️ Mayor user already exists. Updating password to "mayor123"...');
      existingMayor.password = mayorPassword;
      existingMayor.role = 'mayor';
      existingMayor.isActive = true;
      existingMayor.isVerified = true;
      await existingMayor.save();
    } else {
      // 3. Create new mayor
      console.log('🚀 Creating new Mayor user...');
      await User.create({
        name: 'City Mayor',
        email: mayorEmail,
        password: mayorPassword,
        phone: '01700000001',
        role: 'mayor',
        isVerified: true,
        isActive: true,
        authProvider: 'local'
      });
    }

    console.log('\n✨ Mayor account is ready!');
    console.log(`📧 Email: ${mayorEmail}`);
    console.log(`🔑 Password: ${mayorPassword}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding mayor:', error.message);
    process.exit(1);
  }
};

seedMayor();
