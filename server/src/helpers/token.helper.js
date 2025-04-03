const jwt = require("jsonwebtoken")
const crypto = require("crypto")

/**
 * Generate JWT token
 * @param {Object} user - User object containing id, name, and role
 * @returns {string} - JWT token
 */
exports.generateAccessToken = (user) => {
  return jwt.sign({ 
      id: user.id, 
      name: user.name, 
      role: user.role 
    }, 
      process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || "1h",
  })
}

/**
 * Generate refresh token
 * @param {number} size - Token size in bytes
 * @returns {string} - Random refresh token
 */
exports.generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id, name: user.name, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || "30d",
  })
}

/**
 * Generate a 6-digit OTP
 * @returns {string} - 6-digit OTP
 */
exports.generateOTP = () => {
  const otp = Math.floor(100000 + Math.random() * 900000); // Tạo số ngẫu nhiên từ 100000 đến 999999
  return otp.toString(); // Chuyển đổi thành chuỗi
}

/**
 * Hash a token
 * @param {string} token - Token to hash
 * @returns {string} - Hashed token
 */
exports.hashToken = (OTP) => {
  return crypto.createHash("sha256").update(OTP).digest("hex")
}

