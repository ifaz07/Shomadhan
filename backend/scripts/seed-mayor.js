const { seedUser } = require('./lib/seedUser');

seedUser({
  label: 'Mayor',
  role: 'mayor',
  emailVar: 'MAYOR_EMAIL',
  passwordVar: 'MAYOR_PASSWORD',
  name: 'City Mayor',
  phone: '01700000001',
});
