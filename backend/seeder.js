const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User.model');

// Load env vars
dotenv.config(); // Looks for .env in the root by default

// --- Configuration for the Mayor Account ---
const MAYOR_EMAIL = 'dhkmayor@mayordev.com';
const MAYOR_PASSWORD = 'mayor123';
const MAYOR_NAME = 'Dhaka Mayor';
// -----------------------------------------

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected for Seeding...');
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

const importData = async () => {
  try {
    const existingMayor = await User.findOne({ email: MAYOR_EMAIL });

    if (existingMayor) {
      console.log('Mayor account already exists. No action taken.');
    } else {
      // Using User.create() also triggers the pre-save hook for hashing
      await User.create({
        name: MAYOR_NAME,
        email: MAYOR_EMAIL,
        password: MAYOR_PASSWORD,
        role: 'mayor',
        isVerified: true, // Pre-verify the mayor account
        isActive: true,
      });
      console.log(`Successfully created mayor account: ${MAYOR_EMAIL}`);
    }
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    await User.deleteMany({ role: 'mayor' });
    console.log('🔥 Mayor data destroyed!');
  } catch (error) {
    console.error('❌ Error destroying data:', error);
    process.exit(1);
  }
};

const run = async () => {
  await connectDB();

  if (process.argv[2] === '-d') {
    await destroyData();
  } else {
    await importData();
  }

  await mongoose.disconnect();
  console.log('MongoDB Disconnected.');
  process.exit(0);
};

run();