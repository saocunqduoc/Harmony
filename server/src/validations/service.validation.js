const { body } = require("express-validator")
const { validate } = require("../helpers/validation.helper")

// Create service validation
exports.validateCreateService = [
  body("business_id").isInt().withMessage("Business ID must be an integer"),
  body("category_id").isInt().withMessage("Category ID must be an integer"),
  body("name").notEmpty().withMessage("Service name is required"),
  body("description").optional(),
  body("price").isFloat({ min: 0 }).withMessage("Price must be a positive number"),
  body("duration").isInt({ min: 1 }).withMessage("Duration must be a positive integer"),
  validate,
]

// Update service validation
exports.validateUpdateService = [
  body("category_id").optional().isInt().withMessage("Category ID must be an integer"),
  body("name").optional().notEmpty().withMessage("Service name cannot be empty"),
  body("description").optional(),
  body("price").optional().isFloat({ min: 0 }).withMessage("Price must be a positive number"),
  body("duration").optional().isInt({ min: 1 }).withMessage("Duration must be a positive integer"),
  validate,
]

// Service review validation
exports.validateServiceReview = [
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
  body("comment").optional(),
  validate,
]

