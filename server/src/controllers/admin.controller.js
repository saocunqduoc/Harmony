const {
    User,
    Business,
    Service,
    Booking,
    Payment,
    ServiceReview,
    Admin,
    Role,
    UserRole,
    SiteSetting,
    Invoice, // Added Invoice import
  } = require("../models")
  const { ApiError } = require("../middlewares/errorHandler.middleware")
  const ApiResponse = require("../utils/apiResponse")
  const logger = require("../utils/logger")
  const { Op } = require("sequelize")
  const { sequelize } = require("../models")
  const { checkAdminRole } = require("../helpers/permission.helper")
  const { createPaginationMeta, calculateOffset } = require("../helpers/pagination.helper")
  const { getMonthBoundaries } = require("../helpers/date.helper")
  
  // Get dashboard statistics
  exports.getDashboardStats = async (req, res, next) => {
    try {
      // Check if user is admin
      const isAdmin = await checkAdminRole(req.user.id)
      if (!isAdmin) {
        throw new ApiError("You do not have permission to access admin dashboard", 403)
      }
  
      // Get counts
      const userCount = await User.count()
      const businessCount = await Business.count()
      const serviceCount = await Service.count()
      const bookingCount = await Booking.count()
  
      // Get recent bookings
      const recentBookings = await Booking.findAll({
        include: [
          {
            model: User,
            attributes: ["id", "name", "email"],
          },
          {
            model: Business,
            attributes: ["id", "name"],
          },
        ],
        order: [["created_at", "DESC"]],
        limit: 5,
      })
  
      // Get revenue statistics
      const totalRevenue = await Payment.sum("amount", {
        where: { status: "paid" },
      })
  
      // Get monthly revenue for the current year
      const currentYear = new Date().getFullYear()
      const monthlyRevenue = await Payment.findAll({
        attributes: [
          [sequelize.fn("MONTH", sequelize.col("created_at")), "month"],
          [sequelize.fn("SUM", sequelize.col("amount")), "total"],
        ],
        where: {
          status: "paid",
          created_at: {
            [Op.between]: [new Date(`${currentYear}-01-01`), new Date(`${currentYear}-12-31`)],
          },
        },
        group: [sequelize.fn("MONTH", sequelize.col("created_at"))],
        order: [[sequelize.fn("MONTH", sequelize.col("created_at")), "ASC"]],
        raw: true,
      })
  
      // Format monthly revenue
      const formattedMonthlyRevenue = Array(12).fill(0)
      monthlyRevenue.forEach((item) => {
        formattedMonthlyRevenue[Number.parseInt(item.month) - 1] = Number.parseFloat(item.total)
      })
  
      // Get user registration statistics
      const userRegistrations = await User.findAll({
        attributes: [
          [sequelize.fn("DATE_FORMAT", sequelize.col("created_at"), "%Y-%m"), "month"],
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        where: {
          created_at: {
            [Op.gte]: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
          },
        },
        group: [sequelize.fn("DATE_FORMAT", sequelize.col("created_at"), "%Y-%m")],
        order: [[sequelize.fn("DATE_FORMAT", sequelize.col("created_at"), "%Y-%m"), "ASC"]],
        raw: true,
      })
  
      res.status(200).json(
        ApiResponse.success("Dashboard statistics retrieved successfully", {
          counts: {
            users: userCount,
            businesses: businessCount,
            services: serviceCount,
            bookings: bookingCount,
          },
          recentBookings,
          revenue: {
            total: totalRevenue,
            monthly: formattedMonthlyRevenue,
          },
          userRegistrations,
        }),
      )
    } catch (error) {
      next(error)
    }
  }
  
  // Get all businesses (admin)
  exports.getAllBusinesses = async (req, res, next) => {
    try {
      // Check if user is admin
      const isAdmin = await checkAdminRole(req.user.id)
      if (!isAdmin) {
        throw new ApiError("You do not have permission to access admin dashboard", 403)
      }
  
      const { page = 1, limit = 10, search } = req.query
      const offset = calculateOffset(page, limit)
  
      let whereClause = {}
      if (search) {
        whereClause = {
          [Op.or]: [{ name: { [Op.like]: `%${search}%` } }, { address: { [Op.like]: `%${search}%` } }],
        }
      }
  
      const { count, rows: businesses } = await Business.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "owner",
            attributes: ["id", "name", "email"],
          },
        ],
        limit: Number.parseInt(limit),
        offset: offset,
        order: [["created_at", "DESC"]],
      })
  
      const pagination = createPaginationMeta(count, page, limit)
  
      res.status(200).json(
        ApiResponse.success("Businesses retrieved successfully", {
          businesses,
          pagination,
        }),
      )
    } catch (error) {
      next(error)
    }
  }
  
  // Get all users (admin)
  exports.getAllUsers = async (req, res, next) => {
    try {
      // Check if user is admin
      const isAdmin = await checkAdminRole(req.user.id)
      if (!isAdmin) {
        throw new ApiError("You do not have permission to access admin dashboard", 403)
      }
  
      const { page = 1, limit = 10, search, role } = req.query
      const offset = calculateOffset(page, limit)
  
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
  
      let includeClause = [
        {
          model: Role,
          through: UserRole,
          as: "roles",
        },
      ]
  
      if (role) {
        includeClause = [
          {
            model: Role,
            through: UserRole,
            as: "roles",
            where: { name: role },
          },
        ]
      }
  
      const { count, rows: users } = await User.findAndCountAll({
        where: whereClause,
        include: includeClause,
        limit: Number.parseInt(limit),
        offset: offset,
        order: [["created_at", "DESC"]],
        distinct: true,
      })
  
      const pagination = createPaginationMeta(count, page, limit)
  
      res.status(200).json(
        ApiResponse.success("Users retrieved successfully", {
          users,
          pagination,
        }),
      )
    } catch (error) {
      next(error)
    }
  }
  
  // Get all bookings (admin)
  exports.getAllBookings = async (req, res, next) => {
    try {
      // Check if user is admin
      const isAdmin = await checkAdminRole(req.user.id)
      if (!isAdmin) {
        throw new ApiError("You do not have permission to access admin dashboard", 403)
      }
  
      const { page = 1, limit = 10, status, startDate, endDate } = req.query
      const offset = (page - 1) * limit
  
      const whereClause = {}
  
      if (status) {
        whereClause.status = status
      }
  
      if (startDate && endDate) {
        whereClause.booking_date = {
          [Op.between]: [startDate, endDate],
        }
      } else if (startDate) {
        whereClause.booking_date = {
          [Op.gte]: startDate,
        }
      } else if (endDate) {
        whereClause.booking_date = {
          [Op.lte]: endDate,
        }
      }
  
      const { count, rows: bookings } = await Booking.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            attributes: ["id", "name", "email"],
          },
          {
            model: Business,
            attributes: ["id", "name", "address"],
          },
          {
            model: Payment,
          },
        ],
        limit: Number.parseInt(limit),
        offset: Number.parseInt(offset),
        order: [["created_at", "DESC"]],
      })
  
      const totalPages = Math.ceil(count / limit)
  
      res.status(200).json(
        ApiResponse.success("Bookings retrieved successfully", {
          bookings,
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
  
  // Get all payments (admin)
  exports.getAllPayments = async (req, res, next) => {
    try {
      // Check if user is admin
      const isAdmin = await checkAdminRole(req.user.id)
      if (!isAdmin) {
        throw new ApiError("You do not have permission to access admin dashboard", 403)
      }
  
      const { page = 1, limit = 10, status, startDate, endDate } = req.query
      const offset = (page - 1) * limit
  
      const whereClause = {}
  
      if (status) {
        whereClause.status = status
      }
  
      if (startDate && endDate) {
        whereClause.created_at = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        }
      } else if (startDate) {
        whereClause.created_at = {
          [Op.gte]: new Date(startDate),
        }
      } else if (endDate) {
        whereClause.created_at = {
          [Op.lte]: new Date(endDate),
        }
      }
  
      const { count, rows: payments } = await Payment.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            attributes: ["id", "name", "email"],
          },
          {
            model: Booking,
            include: [
              {
                model: Business,
                attributes: ["id", "name"],
              },
            ],
          },
          {
            model: Invoice,
          },
        ],
        limit: Number.parseInt(limit),
        offset: Number.parseInt(offset),
        order: [["created_at", "DESC"]],
      })
  
      const totalPages = Math.ceil(count / limit)
  
      res.status(200).json(
        ApiResponse.success("Payments retrieved successfully", {
          payments,
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
  
  // Get all reviews (admin)
  exports.getAllReviews = async (req, res, next) => {
    try {
      // Check if user is admin
      const isAdmin = await checkAdminRole(req.user.id)
      if (!isAdmin) {
        throw new ApiError("You do not have permission to access admin dashboard", 403)
      }
  
      const { page = 1, limit = 10, rating } = req.query
      const offset = (page - 1) * limit
  
      const whereClause = {}
  
      if (rating) {
        whereClause.rating = rating
      }
  
      const { count, rows: reviews } = await ServiceReview.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            attributes: ["id", "name", "email"],
          },
          {
            model: Service,
            attributes: ["id", "name"],
            include: [
              {
                model: Business,
                attributes: ["id", "name"],
              },
            ],
          },
        ],
        limit: Number.parseInt(limit),
        offset: Number.parseInt(offset),
        order: [["created_at", "DESC"]],
      })
  
      const totalPages = Math.ceil(count / limit)
  
      res.status(200).json(
        ApiResponse.success("Reviews retrieved successfully", {
          reviews,
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
  
  // Delete review (admin)
  exports.deleteReview = async (req, res, next) => {
    try {
      // Check if user is admin
      const isAdmin = await checkAdminRole(req.user.id)
      if (!isAdmin) {
        throw new ApiError("You do not have permission to access admin dashboard", 403)
      }
  
      const { id } = req.params
  
      const review = await ServiceReview.findByPk(id)
  
      if (!review) {
        throw new ApiError("Review not found", 404)
      }
  
      await review.destroy()
  
      // Log the deletion
      logger.info(`Review deleted: ID ${id} by admin ID ${req.user.id}`)
  
      res.status(200).json(ApiResponse.success("Review deleted successfully"))
    } catch (error) {
      next(error)
    }
  }
  
  // Get site settings
  exports.getSiteSettings = async (req, res, next) => {
    try {
      // Check if user is admin
      const isAdmin = await checkAdminRole(req.user.id)
      if (!isAdmin) {
        throw new ApiError("You do not have permission to access admin dashboard", 403)
      }
  
      const settings = await SiteSetting.findAll()
  
      // Convert to key-value object
      const settingsObject = {}
      settings.forEach((setting) => {
        settingsObject[setting.key] = setting.value
      })
  
      res.status(200).json(
        ApiResponse.success("Site settings retrieved successfully", {
          settings: settingsObject,
        }),
      )
    } catch (error) {
      next(error)
    }
  }
  
  // Update site settings
  exports.updateSiteSettings = async (req, res, next) => {
    try {
      // Check if user is admin
      const isAdmin = await checkAdminRole(req.user.id)
      if (!isAdmin) {
        throw new ApiError("You do not have permission to access admin dashboard", 403)
      }
  
      const { settings } = req.body
  
      if (!settings || typeof settings !== "object") {
        throw new ApiError("Invalid settings data", 400)
      }
  
      // Update each setting
      for (const [key, value] of Object.entries(settings)) {
        await SiteSetting.upsert({
          key,
          value: String(value),
        })
      }
  
      // Log the update
      logger.info(`Site settings updated by admin ID ${req.user.id}`)
  
      res.status(200).json(ApiResponse.success("Site settings updated successfully"))
    } catch (error) {
      next(error)
    }
  }
  
  