const {
  Booking,
  BookingService,
  BookingAssignedStaff,
  Service,
  Business,
  User,
  EmployeeSchedule,
  BusinessUser,
  Payment,
  Invoice,
  Admin,
} = require("../models")
const { ApiError } = require("../middlewares/errorHandler.middleware")
const ApiResponse = require("../utils/apiResponse")
const emailService = require("../services/email.service")
const smsService = require("../services/sms.service")
const logger = require("../utils/logger")
const { Op } = require("sequelize")
const { checkBusinessPermission, checkAdminRole } = require("../helpers/permission.helper")
const { createPaginationMeta, calculateOffset } = require("../helpers/pagination.helper")

// Create a new booking
exports.createBooking = async (req, res, next) => {
  try {
    const { business_id, booking_date, booking_time, services, staff_id } = req.body

    const userId = req.user.id

    // Check if business exists
    const business = await Business.findByPk(business_id)
    if (!business) {
      throw new ApiError("Business not found", 404)
    }

    // Check if services exist and belong to the business
    if (!services || !services.length) {
      throw new ApiError("At least one service must be selected", 400)
    }

    const serviceIds = services.map((s) => s.service_id)
    const foundServices = await Service.findAll({
      where: {
        id: { [Op.in]: serviceIds },
        business_id,
      },
    })

    if (foundServices.length !== serviceIds.length) {
      throw new ApiError("One or more services are invalid", 400)
    }

    // Calculate total duration
    let totalDuration = 0
    for (const service of services) {
      const foundService = foundServices.find((s) => s.id === service.service_id)
      totalDuration += foundService.duration
    }

    // Check if the booking time is within business hours
    const bookingDateTime = new Date(`${booking_date}T${booking_time}`)
    const bookingHour = bookingDateTime.getHours()
    const bookingMinute = bookingDateTime.getMinutes()

    const businessOpenTime = new Date(`1970-01-01T${business.open_time}`)
    const businessCloseTime = new Date(`1970-01-01T${business.close_time}`)

    const bookingTimeObj = new Date(`1970-01-01T${bookingHour}:${bookingMinute}:00`)

    if (bookingTimeObj < businessOpenTime || bookingTimeObj > businessCloseTime) {
      throw new ApiError("Booking time is outside business hours", 400)
    }

    // Check if the selected staff is available (if staff_id is provided)
    if (staff_id) {
      // Check if staff exists and works for the business
      const staff = await BusinessUser.findOne({
        where: {
          business_id,
          user_id: staff_id,
        },
      })

      if (!staff) {
        throw new ApiError("Selected staff does not work for this business", 400)
      }

      // Check staff schedule
      const bookingDay = new Date(booking_date).getDay() // 0 = Sunday, 1 = Monday, etc.

      const staffSchedule = await EmployeeSchedule.findOne({
        where: {
          employee_id: staff_id,
          business_id,
          work_date: booking_date,
        },
      })

      if (!staffSchedule) {
        throw new ApiError("Selected staff is not available on this date", 400)
      }

      const scheduleStartTime = new Date(`1970-01-01T${staffSchedule.start_time}`)
      const scheduleEndTime = new Date(`1970-01-01T${staffSchedule.end_time}`)

      if (bookingTimeObj < scheduleStartTime || bookingTimeObj > scheduleEndTime) {
        throw new ApiError("Selected staff is not available at this time", 400)
      }

      // Check if staff has other bookings that would conflict
      const endTime = new Date(bookingDateTime)
      endTime.setMinutes(endTime.getMinutes() + totalDuration)

      const conflictingBookings = await Booking.findAll({
        where: {
          booking_date,
          status: { [Op.in]: ["pending", "confirmed"] },
        },
        include: [
          {
            model: BookingAssignedStaff,
            as: "assignedStaff",
            where: {
              staff_id,
            },
          },
        ],
      })

      for (const booking of conflictingBookings) {
        const bookingStartTime = new Date(`${booking_date}T${booking.booking_time}`)

        // Calculate booking end time
        const bookingEndTime = new Date(bookingStartTime)
        let bookingDuration = 0

        const bookingServices = await BookingService.findAll({
          where: { booking_id: booking.id },
          include: [{ model: Service }],
        })

        for (const bs of bookingServices) {
          bookingDuration += bs.Service.duration
        }

        bookingEndTime.setMinutes(bookingEndTime.getMinutes() + bookingDuration)

        // Check for overlap
        if (
          (bookingStartTime <= bookingDateTime && bookingEndTime > bookingDateTime) ||
          (bookingStartTime < endTime && bookingEndTime >= endTime) ||
          (bookingDateTime <= bookingStartTime && endTime > bookingStartTime)
        ) {
          throw new ApiError("Selected staff has a conflicting booking", 400)
        }
      }
    }

    // Create booking
    const booking = await Booking.create({
      user_id: userId,
      business_id,
      booking_date,
      booking_time,
      status: "pending",
    })

    // Create booking services
    const bookingServices = services.map((service) => ({
      booking_id: booking.id,
      service_id: service.service_id,
      duration: foundServices.find((s) => s.id === service.service_id).duration,
    }))

    await BookingService.bulkCreate(bookingServices)

    // Assign staff if provided
    if (staff_id) {
      await BookingAssignedStaff.create({
        booking_id: booking.id,
        staff_id,
      })
    }

    // Send confirmation email
    await emailService.sendBookingConfirmation(req.user, booking, business)

    // Send confirmation SMS
    try {
      await smsService.sendBookingConfirmation(req.user, booking, business)
    } catch (error) {
      logger.error("Failed to send booking confirmation SMS", { error })
      // Don't fail the booking if SMS fails
    }

    // Log the booking
    logger.info(`Booking created: ID ${booking.id} for business ID ${business_id} by user ID ${userId}`)

    res.status(201).json(ApiResponse.success("Booking created successfully", { booking }))
  } catch (error) {
    next(error)
  }
}

// Get user's bookings
exports.getUserBookings = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { status, page = 1, limit = 10 } = req.query

    const offset = calculateOffset(page, limit)

    const whereClause = { user_id: userId }

    if (status) {
      whereClause.status = status
    }

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Business,
          attributes: ["id", "name", "address", "logo_url"],
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
        {
          model: BookingAssignedStaff,
          as: "assignedStaff",
          include: [
            {
              model: User,
              as: "staff",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      limit: Number.parseInt(limit),
      offset: offset,
      order: [
        ["booking_date", "DESC"],
        ["booking_time", "DESC"],
      ],
    })

    const pagination = createPaginationMeta(count, page, limit)

    res.status(200).json(
      ApiResponse.success("Bookings retrieved successfully", {
        bookings,
        pagination,
      }),
    )
  } catch (error) {
    next(error)
  }
}

// Get booking by ID
exports.getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Find booking
    const booking = await Booking.findByPk(id, {
      include: [
        {
          model: Business,
          attributes: ["id", "name", "address", "logo_url", "phone"],
        },
        {
          model: BookingService,
          as: "services",
          include: [
            {
              model: Service,
              attributes: ["id", "name", "price", "duration", "description"],
            },
          ],
        },
        {
          model: BookingAssignedStaff,
          as: "assignedStaff",
          include: [
            {
              model: User,
              as: "staff",
              attributes: ["id", "name"],
            },
          ],
        },
        {
          model: Payment,
          include: [
            {
              model: Invoice,
            },
          ],
        },
      ],
    })

    if (!booking) {
      throw new ApiError("Booking not found", 404)
    }

    // Check if user is authorized to view this booking
    const isOwner = booking.user_id === userId
    const isBusiness = await checkBusinessPermission(userId, booking.business_id)
    const isAdmin = await checkAdminRole(userId)

    if (!isOwner && !isBusiness && !isAdmin) {
      throw new ApiError("You are not authorized to view this booking", 403)
    }

    res.status(200).json(ApiResponse.success("Booking retrieved successfully", { booking }))
  } catch (error) {
    next(error)
  }
}

// Update booking status (Business owner/manager/staff)
exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { id } = req.params
    const { status } = req.body

    // Validate status
    const validStatuses = ["pending", "confirmed", "completed", "cancelled"]
    if (!validStatuses.includes(status)) {
      throw new ApiError("Invalid status", 400)
    }

    // Find booking
    const booking = await Booking.findByPk(id, {
      include: [
        {
          model: Business,
        },
      ],
    })

    if (!booking) {
      throw new ApiError("Booking not found", 404)
    }

    // Check if user has permission to update this booking
    const hasPermission = await checkBusinessPermission(req.user.id, booking.business_id)
    if (!hasPermission) {
      throw new ApiError("You do not have permission to update this booking", 403)
    }

    // Update booking status
    booking.status = status
    await booking.save()

    // If status is confirmed, send confirmation to customer
    if (status === "confirmed") {
      const customer = await User.findByPk(booking.user_id)

      // Send email confirmation
      await emailService.sendBookingConfirmation(customer, booking, booking.Business)

      // Send SMS confirmation
      try {
        await smsService.sendBookingConfirmation(customer, booking, booking.Business)
      } catch (error) {
        logger.error("Failed to send booking confirmation SMS", { error })
        // Don't fail the update if SMS fails
      }
    }

    // Log the update
    logger.info(`Booking status updated: ID ${booking.id} to ${status} by user ID ${req.user.id}`)

    res.status(200).json(ApiResponse.success("Booking status updated successfully", { booking }))
  } catch (error) {
    next(error)
  }
}

// Cancel booking (Customer)
exports.cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Find booking
    const booking = await Booking.findByPk(id, {
      include: [
        {
          model: Business,
        },
      ],
    })

    if (!booking) {
      throw new ApiError("Booking not found", 404)
    }

    // Check if user is the booking owner
    if (booking.user_id !== userId) {
      throw new ApiError("You do not have permission to cancel this booking", 403)
    }

    // Check if booking can be cancelled (not completed or already cancelled)
    if (booking.status === "completed" || booking.status === "cancelled") {
      throw new ApiError(`Booking cannot be cancelled because it is already ${booking.status}`, 400)
    }

    // Update booking status
    booking.status = "cancelled"
    await booking.save()

    // Notify business about cancellation
    // This could be an email, SMS, or in-app notification

    // Log the cancellation
    logger.info(`Booking cancelled: ID ${booking.id} by user ID ${userId}`)

    res.status(200).json(ApiResponse.success("Booking cancelled successfully"))
  } catch (error) {
    next(error)
  }
}

// Get business bookings (Business owner/manager/staff)
exports.getBusinessBookings = async (req, res, next) => {
  try {
    const { businessId } = req.params
    const { status, date, page = 1, limit = 10 } = req.query

    // Check if user has permission to view bookings for this business
    const hasPermission = await checkBusinessPermission(req.user.id, businessId)
    if (!hasPermission) {
      throw new ApiError("You do not have permission to view bookings for this business", 403)
    }

    const offset = calculateOffset(page, limit)

    const whereClause = { business_id: businessId }

    if (status) {
      whereClause.status = status
    }

    if (date) {
      whereClause.booking_date = date
    }

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ["id", "name", "email", "phone"],
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
        {
          model: BookingAssignedStaff,
          as: "assignedStaff",
          include: [
            {
              model: User,
              as: "staff",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      limit: Number.parseInt(limit),
      offset: offset,
      order: [
        ["booking_date", "ASC"],
        ["booking_time", "ASC"],
      ],
    })

    const pagination = createPaginationMeta(count, page, limit)

    res.status(200).json(
      ApiResponse.success("Business bookings retrieved successfully", {
        bookings,
        pagination,
      }),
    )
  } catch (error) {
    next(error)
  }
}

// Assign staff to booking (Business owner/manager)
exports.assignStaffToBooking = async (req, res, next) => {
  try {
    const { id } = req.params
    const { staff_id } = req.body

    // Find booking
    const booking = await Booking.findByPk(id)

    if (!booking) {
      throw new ApiError("Booking not found", 404)
    }

    // Check if user has permission to update this booking
    const hasPermission = await checkBusinessPermission(req.user.id, booking.business_id)
    if (!hasPermission) {
      throw new ApiError("You do not have permission to update this booking", 403)
    }

    // Check if staff exists and works for the business
    const staff = await BusinessUser.findOne({
      where: {
        business_id: booking.business_id,
        user_id: staff_id,
      },
    })

    if (!staff) {
      throw new ApiError("Selected staff does not work for this business", 400)
    }

    // Remove existing assigned staff
    await BookingAssignedStaff.destroy({
      where: { booking_id: id },
    })

    // Assign new staff
    await BookingAssignedStaff.create({
      booking_id: id,
      staff_id,
    })

    // Log the assignment
    logger.info(`Staff assigned to booking: Booking ID ${id}, Staff ID ${staff_id} by user ID ${req.user.id}`)

    res.status(200).json(ApiResponse.success("Staff assigned to booking successfully"))
  } catch (error) {
    next(error)
  }
}

