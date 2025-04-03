const { body } = require("express-validator")
const { validate } = require("../helpers/validation.helper")

// Create booking validation
exports.validateCreateBooking = [
  body("business_id").isInt().withMessage("Business ID must be an integer"),
  body("booking_date").isDate().withMessage("Booking date must be a valid date"),
  body("booking_time")
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Booking time must be in HH:MM format"),
  body("services").isArray({ min: 1 }).withMessage("At least one service must be selected"),
  body("services.*.service_id").isInt().withMessage("Service ID must be an integer"),
  body("staff_id").optional().isInt().withMessage("Staff ID must be an integer"),
  validate,
]

