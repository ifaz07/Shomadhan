const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User.model');

const fixAdmin = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB...');

    // We look for the one with the dot
    const user = await User.findOne({ email: 'civil.srvc@gmail.com' });

    if (user) {
      console.log('Found admin with dots. Fixing email and password...');
      user.email = 'civilsrvc@gmail.com'; // Normalized version
      user.password = 'shomadhan';      // Reset to plain text so it hashes correctly
      await user.save();
      console.log('✅ Admin fixed! Use "civil.srvc@gmail.com" to login (it will be normalized automatically).');
    } else {
      console.log('Admin with dots not found. Checking for normalized version...');
      const normUser = await User.findOne({ email: 'civilsrvc@gmail.com' });
      if (normUser) {
        console.log('Normalized admin found. Resetting password...');
        normUser.password = 'shomadhan';
        await normUser.save();
        console.log('✅ Password reset for civilsrvc@gmail.com');
      } else {
        console.log('Creating fresh admin...');
        await User.create({
          name: 'System Admin',
          email: 'civilsrvc@gmail.com',
          password: 'shomadhan',
          phone: '01700000000',
          role: 'admin',
          isVerified: true,
          isActive: true
        });
        console.log('✅ Fresh admin created!');
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

fixAdmin();
