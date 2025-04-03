const {
  Service,
  ServiceCategory,
  ServiceImage,
  ServiceReview,
  Business,
  User,
  UserProfile,
  Booking,
  BookingService,
  Role,
  BusinessUser,
} = require("../models")
const { ApiError } = require("../middlewares/errorHandler.middleware")
const ApiResponse = require("../utils/apiResponse")
const uploadService = require("../services/upload.service")
const { Op } = require("sequelize")
const logger = require("../utils/logger")
const { sequelize } = require("../models")

// Get all services
exports.getAllServices = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, category, minPrice, maxPrice, search, sort = "newest" } = req.query

    const offset = (page - 1) * limit

    // Build where clause
    let whereClause = {}

    if (category) {
      whereClause.category_id = category
    }

    if (minPrice && maxPrice) {
      whereClause.price = {
        [Op.between]: [minPrice, maxPrice],
      }
    } else if (minPrice) {
      whereClause.price = {
        [Op.gte]: minPrice,
      }
    } else if (maxPrice) {
      whereClause.price = {
        [Op.lte]: maxPrice,
      }
    }

    if (search) {
      whereClause = {
        ...whereClause,
        [Op.or]: [{ name: { [Op.like]: `%${search}%` } }, { description: { [Op.like]: `%${search}%` } }],
      }
    }

    // Determine sort order
    let order
    switch (sort) {
      case "price_low":
        order = [["price", "ASC"]]
        break
      case "price_high":
        order = [["price", "DESC"]]
        break
      case "duration":
        order = [["duration", "ASC"]]
        break
      case "rating":
        order = [
          [
            sequelize.literal(
              "(SELECT AVG(rating) FROM service_reviews WHERE service_reviews.service_id = Service.id)",
            ),
            "DESC",
          ],
        ]
        break
      case "newest":
      default:
        order = [["id", "DESC"]]
    }

    const { count, rows: services } = await Service.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: ServiceCategory,
          as: "category",
        },
        {
          model: Business,
          attributes: ["id", "name", "address"],
        },
        {
          model: ServiceImage,
          as: "images",
        },
      ],
      limit: Number.parseInt(limit),
      offset: Number.parseInt(offset),
      order,
      distinct: true,
    })

    // Calculate average rating for each service
    for (const service of services) {
      const reviews = await ServiceReview.findAll({
        where: { service_id: service.id },
        attributes: [
          [sequelize.fn("AVG", sequelize.col("rating")), "averageRating"],
          [sequelize.fn("COUNT", sequelize.col("id")), "reviewCount"],
        ],
        raw: true,
      })

      service.dataValues.averageRating = reviews[0].averageRating
        ? Number.parseFloat(reviews[0].averageRating).toFixed(1)
        : null
      service.dataValues.reviewCount = reviews[0].reviewCount
    }

    const totalPages = Math.ceil(count / limit)

    res.status(200).json(
      ApiResponse.success("Services retrieved successfully", {
        services,
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

// Get service by ID
exports.getServiceById = async (req, res, next) => {
  try {
    const { id } = req.params

    const service = await Service.findByPk(id, {
      include: [
        {
          model: ServiceCategory,
          as: "category",
        },
        {
          model: Business,
          attributes: ["id", "name", "address", "logo_url", "open_time", "close_time"],
        },
        {
          model: ServiceImage,
          as: "images",
        },
        {
          model: ServiceReview,
          as: "reviews",
          include: [
            {
              model: User,
              attributes: ["id", "name"],
              include: [
                {
                  model: UserProfile,
                  as: "profile",
                  attributes: ["avatar_url"],
                },
              ],
            },
          ],
          limit: 5,
          order: [["created_at", "DESC"]],
        },
      ],
    })

    if (!service) {
      throw new ApiError("Service not found", 404)
    }

    // Calculate average rating
    const reviews = await ServiceReview.findAll({
      where: { service_id: service.id },
      attributes: [
        [sequelize.fn("AVG", sequelize.col("rating")), "averageRating"],
        [sequelize.fn("COUNT", sequelize.col("id")), "reviewCount"],
      ],
      raw: true,
    })

    service.dataValues.averageRating = reviews[0].averageRating
      ? Number.parseFloat(reviews[0].averageRating).toFixed(1)
      : null
    service.dataValues.reviewCount = reviews[0].reviewCount

    // Get rating distribution
    const ratingDistribution = await ServiceReview.findAll({
      where: { service_id: service.id },
      attributes: ["rating", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      group: ["rating"],
      raw: true,
    })

    service.dataValues.ratingDistribution = ratingDistribution

    res.status(200).json(ApiResponse.success("Service retrieved successfully", { service }))
  } catch (error) {
    next(error)
  }
}

// Create service (Business owner/manager)
exports.createService = async (req, res, next) => {
  try {
    const { business_id, category_id, name, description, price, duration } = req.body

    // Check if user has permission to create service for this business
    const hasPermission = await checkBusinessPermission(req.user.id, business_id)
    if (!hasPermission) {
      throw new ApiError("You do not have permission to create services for this business", 403)
    }

    // Create service
    const service = await Service.create({
      business_id,
      category_id,
      name,
      description,
      price,
      duration,
    })

    // Log the creation
    logger.info(`Service created: ${service.name} for business ID ${business_id}`)

    res.status(201).json(ApiResponse.success("Service created successfully", { service }))
  } catch (error) {
    next(error)
  }
}

// Update service (Business owner/manager)
exports.updateService = async (req, res, next) => {
  try {
    const { id } = req.params
    const { category_id, name, description, price, duration } = req.body

    const service = await Service.findByPk(id)

    if (!service) {
      throw new ApiError("Service not found", 404)
    }

    // Check if user has permission to update this service
    const hasPermission = await checkBusinessPermission(req.user.id, service.business_id)
    if (!hasPermission) {
      throw new ApiError("You do not have permission to update this service", 403)
    }

    // Update service
    if (category_id) service.category_id = category_id
    if (name) service.name = name
    if (description) service.description = description
    if (price) service.price = price
    if (duration) service.duration = duration

    await service.save()

    // Log the update
    logger.info(`Service updated: ${service.name} (ID: ${service.id})`)

    res.status(200).json(ApiResponse.success("Service updated successfully", { service }))
  } catch (error) {
    next(error)
  }
}

// Delete service (Business owner/manager)
exports.deleteService = async (req, res, next) => {
  try {
    const { id } = req.params

    const service = await Service.findByPk(id)

    if (!service) {
      throw new ApiError("Service not found", 404)
    }

    // Check if user has permission to delete this service
    const hasPermission = await checkBusinessPermission(req.user.id, service.business_id)
    if (!hasPermission) {
      throw new ApiError("You do not have permission to delete this service", 403)
    }

    // Delete service images from Cloudinary
    const serviceImages = await ServiceImage.findAll({ where: { service_id: id } })
    for (const image of serviceImages) {
      // Extract public_id from URL
      const publicId = image.image_url.split("/").pop().split(".")[0]
      await uploadService.deleteImage(publicId)
    }

    // Delete service
    await service.destroy()

    // Log the deletion
    logger.info(`Service deleted: ${service.name} (ID: ${service.id})`)

    res.status(200).json(ApiResponse.success("Service deleted successfully"))
  } catch (error) {
    next(error)
  }
}

// Upload service image (Business owner/manager)
exports.uploadServiceImage = async (req, res, next) => {
  try {
    const { id } = req.params

    if (!req.file) {
      throw new ApiError("No file uploaded", 400)
    }

    const service = await Service.findByPk(id)

    if (!service) {
      throw new ApiError("Service not found", 404)
    }

    // Check if user has permission to update this service
    const hasPermission = await checkBusinessPermission(req.user.id, service.business_id)
    if (!hasPermission) {
      throw new ApiError("You do not have permission to upload images for this service", 403)
    }

    // Upload to Cloudinary
    const result = await uploadService.uploadServiceImage(req.file.buffer, id)

    // Create service image
    const serviceImage = await ServiceImage.create({
      service_id: id,
      image_url: result.secure_url,
    })

    // Log the upload
    logger.info(`Service image uploaded for service ID ${id}`)

    res.status(201).json(ApiResponse.success("Service image uploaded successfully", { serviceImage }))
  } catch (error) {
    next(error)
  }
}

// Delete service image (Business owner/manager)
exports.deleteServiceImage = async (req, res, next) => {
  try {
    const { id, imageId } = req.params

    const service = await Service.findByPk(id)

    if (!service) {
      throw new ApiError("Service not found", 404)
    }

    // Check if user has permission to update this service
    const hasPermission = await checkBusinessPermission(req.user.id, service.business_id)
    if (!hasPermission) {
      throw new ApiError("You do not have permission to delete images for this service", 403)
    }

    const serviceImage = await ServiceImage.findOne({
      where: {
        id: imageId,
        service_id: id,
      },
    })

    if (!serviceImage) {
      throw new ApiError("Service image not found", 404)
    }

    // Delete from Cloudinary
    const publicId = serviceImage.image_url.split("/").pop().split(".")[0]
    await uploadService.deleteImage(publicId)

    // Delete from database
    await serviceImage.destroy()

    // Log the deletion
    logger.info(`Service image deleted for service ID ${id}`)

    res.status(200).json(ApiResponse.success("Service image deleted successfully"))
  } catch (error) {
    next(error)
  }
}

// Add review for a service
exports.addServiceReview = async (req, res, next) => {
  try {
    const { id } = req.params
    const { rating, comment } = req.body
    const userId = req.user.id

    // Check if service exists
    const service = await Service.findByPk(id)
    if (!service) {
      throw new ApiError("Service not found", 404)
    }

    // Check if user has booked and completed this service
    const hasCompletedBooking = await Booking.findOne({
      where: {
        user_id: userId,
        status: "completed",
      },
      include: [
        {
          model: BookingService,
          as: "services",
          where: {
            service_id: id,
          },
        },
      ],
    })

    if (!hasCompletedBooking) {
      throw new ApiError("You can only review services you have used", 403)
    }

    // Check if user has already reviewed this service
    const existingReview = await ServiceReview.findOne({
      where: {
        service_id: id,
        user_id: userId,
      },
    })

    if (existingReview) {
      throw new ApiError("You have already reviewed this service", 400)
    }

    // Create review
    const review = await ServiceReview.create({
      service_id: id,
      user_id: userId,
      rating,
      comment,
    })

    // Log the review
    logger.info(`Review added for service ID ${id} by user ID ${userId}`)

    res.status(201).json(ApiResponse.success("Review added successfully", { review }))
  } catch (error) {
    next(error)
  }
}

// Get all reviews for a service
exports.getServiceReviews = async (req, res, next) => {
  try {
    const { id } = req.params
    const { page = 1, limit = 10 } = req.query

    const offset = (page - 1) * limit

    // Check if service exists
    const service = await Service.findByPk(id)
    if (!service) {
      throw new ApiError("Service not found", 404)
    }

    const { count, rows: reviews } = await ServiceReview.findAndCountAll({
      where: { service_id: id },
      include: [
        {
          model: User,
          attributes: ["id", "name"],
          include: [
            {
              model: UserProfile,
              as: "profile",
              attributes: ["avatar_url"],
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
      ApiResponse.success("Service reviews retrieved successfully", {
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

// Helper function to check if user has permission for a business
const checkBusinessPermission = async (userId, businessId) => {
  // Check if user is owner
  const business = await Business.findOne({
    where: {
      id: businessId,
      owner_id: userId,
    },
  })

  if (business) {
    return true
  }

  // Check if user is manager
  const managerRole = await Role.findOne({ where: { name: "manager" } })

  if (managerRole) {
    const isManager = await BusinessUser.findOne({
      where: {
        business_id: businessId,
        user_id: userId,
        role_id: managerRole.id,
      },
    })

    if (isManager) {
      return true
    }
  }

  return false
}

