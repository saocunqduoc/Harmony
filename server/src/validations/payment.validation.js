const { body } = require("express-validator")
const { validate } = require("../helpers/validation.helper")

// Create payment validation
exports.validateCreatePayment = [
  body("booking_id").isInt().withMessage("Booking ID must be an integer"),
  body("amount").optional().isFloat({ min: 0 }).withMessage("Amount must be a positive number"),
  validate,
]

