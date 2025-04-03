const { User, UserProfile, Role, UserRole, Booking, Business, BookingService, Service } = require("../models")
const { ApiError } = require("../middlewares/errorHandler.middleware")
const ApiResponse = require("../utils/apiResponse")
const uploadService = require("../services/upload.service")
const logger = require("../utils/logger")
const { Op } = require("sequelize")
const Api = require("twilio/lib/rest/Api")

// Get user profile
exports.getUserProfile = async (req, res, next) => {
  try {
    const userId = req.params.id || req.user.id

    const user = await User.findByPk(userId, {
      include: [
        {
          model: UserProfile,
          as: "profile",
        },
      ],
      attributes: { exclude: ["password"] },
    })

    if (!user) {
      throw new ApiError("User not found", 404)
    }

    res.status(200).json(ApiResponse.success("User profile retrieved successfully", { user }))
  } catch (error) {
    next(error)
  }
}

// Update user profile
exports.updateUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { name, phone, address } = req.body

    // Update user
    const user = await User.findByPk(userId)
    if (!user) {
      throw new ApiError("User not found", 404)
    }

    if (name) user.name = name
    if (phone) {
      const isExistPhoneNumber = await User.findOne({phone})
      if(isExistPhoneNumber) {
        throw new ApiError("PhoneNumber already existed!", 409)
      }
    } 
    await user.save()

    // Update profile
    let profile = await UserProfile.findOne({ where: { user_id: userId } })
    if (!profile) {
      profile = await UserProfile.create({ user_id: userId })
    }

    if (address) profile.address = address
    await profile.save()

    // Log the update
    logger.info(`Profile updated for user: ${user.email}`)

    res.status(200).json(
      ApiResponse.success("Profile updated successfully", {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          profile,
        },
      }),
    )
  } catch (error) {
    next(error)
  }
}

// Upload profile picture
exports.uploadProfilePicture = async (req, res, next) => {
  try {
    const userId = req.user.id

    if (!req.file) {
      throw new ApiError("No file uploaded", 400)
    }

    // Upload to Cloudinary
    const result = await uploadService.uploadProfileImage(req.file.buffer, userId)

    // Update profile
    let profile = await UserProfile.findOne({ where: { user_id: userId } })
    if (!profile) {
      profile = await UserProfile.create({ user_id: userId })
    }

    profile.avatar_url = result.secure_url
    await profile.save()

    // Log the upload
    logger.info(`Profile picture uploaded for user: ${req.user.email}`)

    res.status(200).json(
      ApiResponse.success("Profile picture uploaded successfully", {
        avatar_url: result.secure_url,
      }),
    )
  } catch (error) {
    next(error)
  }
}

// Get user bookings
exports.getUserBookings = async (req, res, next) => {
  try {
    const userId = req.user.id

    const bookings = await Booking.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Business,
          attributes: ["id", "name", "address"],
        },
        {
          model: BookingService,
          as: "services",
          include: [
            {
              model: Service,
              attributes: ["id", "name", "price", "duration"],
            },
          ],
        },
      ],
      order: [
        ["booking_date", "DESC"],
        ["booking_time", "DESC"],
      ],
    })

    res.status(200).json(ApiResponse.success("User bookings retrieved successfully", { bookings }))
  } catch (error) {
    next(error)
  }
}

// Admin: Get all users
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query
    const offset = (page - 1) * limit

    let whereClause = {}
    if (search) {
      whereClause = {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
        ],
      }
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Role,
          through: UserRole,
          as: "roles",
        },
      ],
      attributes: { exclude: ["password"] },
      limit: Number.parseInt(limit),
      offset: Number.parseInt(offset),
      order: [["created_at", "DESC"]],
    })

    const totalPages = Math.ceil(count / limit)

    res.status(200).json(
      ApiResponse.success("Users retrieved successfully", {
        users,
        pagination: {
          total: count,
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          totalPages,
        },
      }),
    )
  } catch (error) {
    next(error)
  }
}

// Admin: Update user roles
exports.updateUserRoles = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { roleIds } = req.body

    const user = await User.findByPk(userId)
    if (!user) {
      throw new ApiError("User not found", 404)
    }

    // Delete existing roles
    await UserRole.destroy({ where: { user_id: userId } })

    // Add new roles
    const userRoles = roleIds.map((roleId) => ({
      user_id: userId,
      role_id: roleId,
    }))

    await UserRole.bulkCreate(userRoles)

    // Log the update
    logger.info(`Roles updated for user: ${user.email}`)

    res.status(200).json(ApiResponse.success("User roles updated successfully"))
  } catch (error) {
    next(error)
  }
}

