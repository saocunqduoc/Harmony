const express = require("express")
const router = express.Router()
const bookingController = require("../controllers/booking.controller")
const { authenticate, authorize } = require("../middlewares/auth.middleware")
const { validateCreateBooking } = require("../validations/booking.validation")

// User routes
router.post("/", authenticate, validateCreateBooking, bookingController.createBooking)
router.get("/user", authenticate, bookingController.getUserBookings)
router.get("/:id", authenticate, bookingController.getBookingById)
router.put("/:id/cancel", authenticate, bookingController.cancelBooking)

// Business routes
router.get("/business/:businessId", authenticate, bookingController.getBusinessBookings)
router.put("/:id/status", authenticate, authorize("owner", "manager", "staff"), bookingController.updateBookingStatus)
router.put("/:id/assign-staff", authenticate, authorize("owner", "manager"), bookingController.assignStaffToBooking)

module.exports = router

