const ApiResponse = require("../utils/apiResponse")

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {Object} data - Response data
 * @param {number} statusCode - HTTP status code
 */
exports.sendSuccess = (res, message, data = null, statusCode = 200) => {
  return res.status(statusCode).json(ApiResponse.success(message, data))
}

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object} data - Response data
 * @param {number} statusCode - HTTP status code
 */
exports.sendError = (res, message, data = null, statusCode = 400) => {
  return res.status(statusCode).json(ApiResponse.error(message, data))
}

/**
 * Send created response
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {Object} data - Response data
 */
exports.sendCreated = (res, message, data = null) => {
  return res.status(201).json(ApiResponse.success(message, data))
}

/**
 * Send not found response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
exports.sendNotFound = (res, message = "Resource not found") => {
  return res.status(404).json(ApiResponse.error(message))
}

/**
 * Send unauthorized response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
exports.sendUnauthorized = (res, message = "Unauthorized access") => {
  return res.status(401).json(ApiResponse.error(message))
}

/**
 * Send forbidden response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
exports.sendForbidden = (res, message = "Forbidden access") => {
  return res.status(403).json(ApiResponse.error(message))
}

