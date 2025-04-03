const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const moment = require('moment-timezone');
const { User, Role, UserRole, UserProfile } = require("../models")
const { ApiError } = require("../middlewares/errorHandler.middleware")
const ApiResponse = require("../utils/apiResponse")
const emailService = require("../services/email.service")
const smsService = require("../services/sms.service")
const logger = require("../utils/logger")
const { generateAccessToken, generateRefreshToken, generateOTP, hashToken } = require("../helpers/token.helper")
const { Sequelize } = require('sequelize'); // Import Sequelize trực tiếp
const { Op } = Sequelize

// Remove the generateToken function since we're now importing it

// Register a new user
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } })
    if (existingUser) {
      throw new ApiError("Email đã được sử dụng.", 400)
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
    })

    // Create user profile
    await UserProfile.create({
      user_id: user.id,
    })

    // Assign default role (customer)
    const customerRole = await Role.findOne({ where: { name: "customer" } })
    if (customerRole) {
      await UserRole.create({
        user_id: user.id,
        role_id: customerRole.id,
      })
    }

    // Send welcome email
    await emailService.sendWelcomeEmail(user)

    // Generate tokens
    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user)

    // Log the registration
    logger.info(`User registered: ${user.email}`)

    // Return user data (without password)
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
    }

    res.status(201).json(
      ApiResponse.success("Đăng ký tài khoản thành công!", {
        user: userData,
        access_token: accessToken,
        refresh_token: refreshToken
      }),
    )
  } catch (error) {
    next(error)
  }
}

// Login user
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body

    // Check if user exists
    const user = await User.findOne({
      where: { email },
      include: [
        {
          model: Role,
          through: UserRole,
          as: "roles",
        },
      ],
    })

    if (!user) {
      throw new ApiError("Email hoặc mật khẩu không chính xác", 401)
    }

    // Check if password is correct
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      throw new ApiError("Email hoặc mật khẩu không chính xác", 401)
    }

    // Generate tokens
    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user)

    // Log the login
    logger.info(`User logged in: ${user.email}`)

    // Return user data (without password)
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      roles: user.roles.map((role) => role.name),
    }

    res.status(200).json(
      ApiResponse.success("Đăng nhập thành công", {
        user: userData,
        accessToken,
        refreshToken
      }),
    )
  } catch (error) {
    next(error)
  }
}

// Forgot password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body; // identifier có thể là email hoặc số điện thoại
    // Kiểm tra xem identifier có phải là số điện thoại không
    const user = await User.findOne({ where: { email: email } });


    if (!user) {
      throw new ApiError("Email không chính xác!", 404);
    }

    // Generate reset token
    const resetToken = generateOTP();
    
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour in UTC

    // Store hashed token in database
    const hashedToken = hashToken(resetToken);

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = resetTokenExpiry; // Lưu theo định dạng UTC
    await user.save();

    await emailService.sendPasswordResetEmail(user, resetToken);

    // Log the password reset request
    logger.info(`Password reset requested for: `, email);

    res.status(200).json(ApiResponse.success("Password reset email sent"));
  } catch (error) {
    next(error);
  }
}

// Reset password
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body

    // Hash the token from the request
    const hashedToken = hashToken(token)

    // Find user with the token
    const user = await User.findOne({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { [Op.gt]: Date.now() },
      },
    })

    if (!user) {
      throw new ApiError("Token không chính xác hoặc hết hạn.", 400)
    }

    // Update password
    user.password = password
    user.resetPasswordToken = null
    user.resetPasswordExpires = null
    await user.save()

    // Log the password reset
    logger.info(`Password reset completed for: ${user.email}`)

    res.status(200).json(ApiResponse.success("Thay đổi mật khẩu thành công."))
  } catch (error) {
    next(error)
  }
}

// Change password
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.user.id

    // Find user
    const user = await User.findByPk(userId)
    if (!user) {
      throw new ApiError("Không tìm thấy người dùng.", 404)
    }

    // Check if current password is correct
    const isPasswordValid = await user.comparePassword(currentPassword)
    if (!isPasswordValid) {
      throw new ApiError("Mật khẩu hiện tại không chính xác.", 401)
    }

    // Update password
    user.password = newPassword
    await user.save()

    // Log the password change
    logger.info(`Password changed for user: ${user.email}`)

    res.status(200).json(ApiResponse.success("Mật khẩu được thay đổi thành công."))
  } catch (error) {
    next(error)
  }
}

// Get current user
exports.getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.id

    const user = await User.findByPk(userId, {
      include: [
        {
          model: UserProfile,
          as: "profile",
        },
        {
          model: Role,
          through: UserRole,
          as: "roles",
        },
      ],
      attributes: { exclude: ["password"] },
    })

    if (!user) {
      throw new ApiError("Không tìm thấy người dùng", 404)
    }

    res.status(200).json(ApiResponse.success("Truy cập thông tin người dùng thành công", { user }))
  } catch (error) {
    next(error)
  }
}

