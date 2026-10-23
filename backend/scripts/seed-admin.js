const { seedUser } = require('./lib/seedUser');

seedUser({
  label: 'Admin',
  role: 'admin',
  emailVar: 'ADMIN_EMAIL',
  passwordVar: 'ADMIN_PASSWORD',
  name: 'System Admin',
  phone: '01700000000',
});
