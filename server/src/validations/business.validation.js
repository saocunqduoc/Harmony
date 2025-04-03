const { body } = require("express-validator")
const { validate } = require("../helpers/validation.helper")

// Create business validation
exports.validateCreateBusiness = [
  body("name").notEmpty().withMessage("Business name is required"),
  body("address").notEmpty().withMessage("Business address is required"),
  body("open_time")
    .notEmpty()
    .withMessage("Opening time is required")
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Opening time must be in HH:MM format"),
  body("close_time")
    .notEmpty()
    .withMessage("Closing time is required")
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Closing time must be in HH:MM format"),
  body("description").optional(),
  validate,
]

// Update business validation
exports.validateUpdateBusiness = [
  body("name").optional().notEmpty().withMessage("Business name cannot be empty"),
  body("address").optional().notEmpty().withMessage("Business address cannot be empty"),
  body("open_time")
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Opening time must be in HH:MM format"),
  body("close_time")
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Closing time must be in HH:MM format"),
  body("description").optional(),
  validate,
]

