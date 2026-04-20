const { body } = require('express-validator');

const registerValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/(?=.*[a-z])/).withMessage('Password must contain a lowercase letter')
    .matches(/(?=.*[A-Z])/).withMessage('Password must contain an uppercase letter')
    .matches(/(?=.*\d)/).withMessage('Password must contain a number')
    .matches(/(?=.*[!@#$%^&*])/).withMessage('Password must contain a special character (!@#$%^&*)'),

  body('phone')
    .optional()
    .trim()
    .matches(/^(\+880|0)?1[3-9]\d{8}$/).withMessage('Please provide a valid BD phone number'),

  body('presentAddress')
    .optional()
    .isObject().withMessage('Present address must be an object'),

  // ─── Public Servant conditional validations ────────────────────
  body('role')
    .optional()
    .isIn(['citizen', 'department_officer']).withMessage('Invalid role selection'),

  body('department')
    .if(body('role').equals('department_officer'))
    .notEmpty().withMessage('Department is required for public servants')
    .isIn([
      'public_works', 'water_authority', 'electricity', 'sanitation',
      'public_safety', 'animal_control', 'health', 'transport', 'environment', 'police', 'other',
    ]).withMessage('Invalid department'),

  body('nidNumber')
    .if(body('role').equals('department_officer'))
    .notEmpty().withMessage('NID number is required')
    .isLength({ min: 10, max: 10 }).withMessage('NID number must be exactly 10 digits')
    .isNumeric().withMessage('NID must contain only digits'),

  body('employeeId')
    .if(body('role').equals('department_officer'))
    .notEmpty().withMessage('Employee ID is required for public servants')
    .trim(),

  body('governmentEmail')
    .if(body('role').equals('department_officer'))
    .notEmpty().withMessage('Government email is required')
    .isEmail().withMessage('Please provide a valid government email'),

  body('designation')
    .if(body('role').equals('department_officer'))
    .notEmpty().withMessage('Designation is required')
    .trim()
    .isLength({ max: 100 }).withMessage('Designation cannot exceed 100 characters'),
];

const loginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),

  body('password')
    .notEmpty().withMessage('Password is required'),
];

module.exports = { registerValidator, loginValidator };
