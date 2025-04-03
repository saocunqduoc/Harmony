const { ValidationError } = require("sequelize");

// Định nghĩa các mã lỗi và thông điệp
const errorMessages = {
  validation: {
    statusCode: 400,
    message: "Validation error",
  },
  invalidToken: {
    statusCode: 401,
    message: "Invalid token",
  },
  tokenExpired: {
    statusCode: 401,
    message: "Token expired",
  },
  internal: {
    statusCode: 500,
    message: "Internal server error",
  },
};

// Middleware xử lý lỗi
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Xử lý lỗi validation của Sequelize
  if (err instanceof ValidationError) {
    return res.status(errorMessages.validation.statusCode).json({
      status: "error",
      message: errorMessages.validation.message,
      errors: err.errors.map((e) => ({
        field: e.path,
        message: e.message,
      })),
    });
  }

  // Xử lý lỗi JWT
  if (err.name === "JsonWebTokenError") {
    return res.status(errorMessages.invalidToken.statusCode).json({
      status: "error",
      message: errorMessages.invalidToken.message,
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(errorMessages.tokenExpired.statusCode).json({
      status: "error",
      message: errorMessages.tokenExpired.message,
    });
  }

  // Xử lý lỗi API tùy chỉnh
  if (err.isApiError) {
    return res.status(err.statusCode || errorMessages.internal.statusCode).json({
      status: "error",
      message: err.message,
    });
  }

  // Lỗi mặc định
  return res.status(errorMessages.internal.statusCode).json({
    status: "error",
    message: process.env.NODE_ENV === "production" ? errorMessages.internal.message : err.message,
  });
};

// Lớp ApiError
class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isApiError = true;
  }
}

module.exports = {
  errorHandler,
  ApiError,
};