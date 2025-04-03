const { body } = require("express-validator")
const { validate } = require("../helpers/validation.helper")

// Update profile validation
exports.validateUpdateProfile = [
  body("name").optional().notEmpty().withMessage("Name cannot be empty"),
  body("phone").optional().notEmpty().withMessage("Phone number cannot be empty"),
  body("address").optional(),
  validate,
]

