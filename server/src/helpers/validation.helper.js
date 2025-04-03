const { validationResult } = require("express-validator")
const { ApiError } = require("../middlewares/errorHandler.middleware")

/**
 * Validate request using express-validator
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.param,
      message: error.msg,
    }))

    return next(new ApiError("Validation error", 400, errorMessages))
  }
  next()
}

