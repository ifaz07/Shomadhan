const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');
const User = require('../../models/User.model');

const MIN_PASSWORD_LENGTH = 12;

const readRequired = (name) => {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name}. Set it in backend/.env before running this script.`);
    process.exit(1);
  }
  return value;
};

// Creates a privileged account from environment variables. An existing account
// keeps its password unless the script is run with --reset-password.
const seedUser = async ({ label, role, emailVar, passwordVar, name, phone }) => {
  const email = readRequired(emailVar);
  const password = readRequired(passwordVar);
  readRequired('MONGODB_URI');

  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`${passwordVar} must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    process.exit(1);
  }

  const resetPassword = process.argv.includes('--reset-password');

  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      existing.role = role;
      existing.isActive = true;
      existing.isVerified = true;
      if (resetPassword) existing.password = password;
      await existing.save();
      console.log(`${label} account already exists (${existing.email}); ${resetPassword ? 'password reset' : 'password unchanged'}.`);
    } else {
      await User.create({
        name,
        email,
        password,
        phone,
        role,
        isVerified: true,
        isActive: true,
        authProvider: 'local',
      });
      console.log(`${label} account created (${email.toLowerCase()}).`);
    }
  } catch (error) {
    console.error(`Error seeding ${label.toLowerCase()}:`, error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

module.exports = { seedUser };
