const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('../models/User.model');

const seedAdmin = async () => {
  try {
    // 1. Connect to your database using your .env URI
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('❌ MONGODB_URI not found in .env file');
      process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB...');

    const adminEmail = 'civil.srvc@gmail.com';
    const adminPassword = 'shomadhan';

    // 2. Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('ℹ️ Admin user already exists. Updating password to "shomadhan"...');
      existingAdmin.password = adminPassword;
      existingAdmin.role = 'admin';
      existingAdmin.isActive = true;
      existingAdmin.isVerified = true;
      await existingAdmin.save();
    } else {
      // 3. Create new admin
      console.log('🚀 Creating new Admin user...');
      await User.create({
        name: 'System Admin',
        email: adminEmail,
        password: adminPassword,
        phone: '01700000000',
        role: 'admin',
        isVerified: true,
        isActive: true,
        authProvider: 'local'
      });
    }

    console.log('\n✨ Admin account is ready!');
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();
