const { body } = require("express-validator")
const { validate } = require("../helpers/validation.helper")

// Register validation
exports.validateRegister = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Please provide a valid email"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 8 characters long"),
  validate,
]

// Login validation
exports.validateLogin = [
  body("email").isEmail().withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
  validate,
]

// Reset password validation
exports.validateResetPassword = [
  body("token").notEmpty().withMessage("Token is required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 8 characters long"),
  validate,
]

// Change password validation
exports.validateChangePassword = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),
  body("newPassword").isLength({ min: 6 }).withMessage("New password must be at least 8 characters long"),
  validate,
]

// Validation cho forgotPassword
exports.validateForgotPassword = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage("Please provide a valid email")
    .isLength({ min: 5 }).withMessage('Must be at least 5 characters long')
];

