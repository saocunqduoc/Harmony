const { Payment, Booking, User, Business, Service, BookingService, Invoice, BusinessUser, Admin } = require("../models")
const { ApiError } = require("../middlewares/errorHandler.middleware")
const ApiResponse = require("../utils/apiResponse")
const emailService = require("../services/email.service")
const logger = require("../utils/logger")
const { Op } = require("sequelize")
const { checkBusinessPermission, checkAdminRole } = require("../helpers/permission.helper")
const { generateInvoice } = require("../helpers/invoice.helper")
const { createPaginationMeta, calculateOffset } = require("../helpers/pagination.helper")

// Create payment for booking
exports.createPayment = async (req, res, next) => {
  try {
    const { booking_id, amount } = req.body
    const userId = req.user.id

    // Find booking
    const booking = await Booking.findByPk(booking_id, {
      include: [
        {
          model: Business,
        },
        {
          model: BookingService,
          as: "services",
          include: [
            {
              model: Service,
            },
          ],
        },
      ],
    })

    if (!booking) {
      throw new ApiError("Booking not found", 404)
    }

    // Check if user is authorized
    if (booking.user_id !== userId) {
      throw new ApiError("You are not authorized to make payment for this booking", 403)
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({
      where: { booking_id },
    })

    if (existingPayment) {
      throw new ApiError("Payment already exists for this booking", 400)
    }

    // Calculate total amount from services if not provided
    let paymentAmount = amount

    if (!paymentAmount) {
      paymentAmount = booking.services.reduce((total, bs) => {
        return total + bs.Service.price
      }, 0)
    }

    // Create payment
    const payment = await Payment.create({
      booking_id,
      user_id: userId,
      amount: paymentAmount,
      status: "pending",
    })

    // Log the payment creation
    logger.info(`Payment created: ID ${payment.id} for booking ID ${booking_id} by user ID ${userId}`)

    res.status(201).json(ApiResponse.success("Payment created successfully", { payment }))
  } catch (error) {
    next(error)
  }
}

// Process payment (simulate payment gateway)
exports.processPayment = async (req, res, next) => {
  try {
    const { id } = req.params
    const { payment_method } = req.body
    const userId = req.user.id

    // Find payment
    const payment = await Payment.findByPk(id, {
      include: [
        {
          model: Booking,
          include: [
            {
              model: Business,
            },
          ],
        },
      ],
    })

    if (!payment) {
      throw new ApiError("Payment not found", 404)
    }

    // Check if user is authorized
    if (payment.user_id !== userId) {
      throw new ApiError("You are not authorized to process this payment", 403)
    }

    // Check if payment is already processed
    if (payment.status === "paid") {
      throw new ApiError("Payment has already been processed", 400)
    }

    // Simulate payment processing
    // In a real application, this would integrate with a payment gateway

    // Update payment status
    payment.status = "paid"
    await payment.save()

    // Generate invoice
    const invoiceUrl = await generateInvoice(payment)

    // Create invoice record
    const invoice = await Invoice.create({
      payment_id: payment.id,
      invoice_url: invoiceUrl,
    })

    // Update booking status if it's pending
    if (payment.Booking.status === "pending") {
      payment.Booking.status = "confirmed"
      await payment.Booking.save()
    }

    // Send invoice email
    const user = await User.findByPk(userId)
    await emailService.sendInvoice(user, payment, invoice)

    // Log the payment processing
    logger.info(`Payment processed: ID ${payment.id} for booking ID ${payment.booking_id} by user ID ${userId}`)

    res.status(200).json(
      ApiResponse.success("Payment processed successfully", {
        payment,
        invoice,
      }),
    )
  } catch (error) {
    next(error)
  }
}

// Get payment by ID
exports.getPaymentById = async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Find payment
    const payment = await Payment.findByPk(id, {
      include: [
        {
          model: Booking,
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
                  attributes: ["id", "name", "price"],
                },
              ],
            },
          ],
        },
        {
          model: Invoice,
        },
      ],
    })

    if (!payment) {
      throw new ApiError("Payment not found", 404)
    }

    // Check if user is authorized
    const isCustomer = payment.user_id === userId
    const isBusiness = await checkBusinessPermission(userId, payment.Booking.business_id)
    const isAdmin = await checkAdminRole(userId)

    if (!isCustomer && !isBusiness && !isAdmin) {
      throw new ApiError("You are not authorized to view this payment", 403)
    }

    res.status(200).json(ApiResponse.success("Payment retrieved successfully", { payment }))
  } catch (error) {
    next(error)
  }
}

// Get user payments
exports.getUserPayments = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { status, page = 1, limit = 10 } = req.query

    const offset = calculateOffset(page, limit)

    const whereClause = { user_id: userId }

    if (status) {
      whereClause.status = status
    }

    const { count, rows: payments } = await Payment.findAndCountAll({
      where: whereClause,
      include: [
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
      offset: offset,
      order: [["created_at", "DESC"]],
    })

    const pagination = createPaginationMeta(count, page, limit)

    res.status(200).json(
      ApiResponse.success("User payments retrieved successfully", {
        payments,
        pagination,
      }),
    )
  } catch (error) {
    next(error)
  }
}

// Get business payments
exports.getBusinessPayments = async (req, res, next) => {
  try {
    const { businessId } = req.params
    const { status, startDate, endDate, page = 1, limit = 10 } = req.query

    // Check if user has permission to view payments for this business
    const hasPermission = await checkBusinessPermission(req.user.id, businessId)
    if (!hasPermission) {
      throw new ApiError("You do not have permission to view payments for this business", 403)
    }

    const offset = (page - 1) * limit

    // Build where clause for bookings
    const bookingWhereClause = { business_id: businessId }

    // Build where clause for payments
    const paymentWhereClause = {}

    if (status) {
      paymentWhereClause.status = status
    }

    if (startDate && endDate) {
      paymentWhereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      }
    } else if (startDate) {
      paymentWhereClause.created_at = {
        [Op.gte]: new Date(startDate),
      }
    } else if (endDate) {
      paymentWhereClause.created_at = {
        [Op.lte]: new Date(endDate),
      }
    }

    const { count, rows: payments } = await Payment.findAndCountAll({
      where: paymentWhereClause,
      include: [
        {
          model: Booking,
          where: bookingWhereClause,
          include: [
            {
              model: User,
              attributes: ["id", "name", "email"],
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
      ApiResponse.success("Business payments retrieved successfully", {
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

