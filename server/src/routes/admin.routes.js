const express = require("express")
const router = express.Router()
const adminController = require("../controllers/admin.controller")
const { authenticate, authorize } = require("../middlewares/auth.middleware")

// Admin routes (all require admin role)
router.get("/dashboard", authenticate, authorize("admin"), adminController.getDashboardStats)
router.get("/users", authenticate, authorize("admin"), adminController.getAllUsers)
router.get("/businesses", authenticate, authorize("admin"), adminController.getAllBusinesses)
router.get("/bookings", authenticate, authorize("admin"), adminController.getAllBookings)
router.get("/payments", authenticate, authorize("admin"), adminController.getAllPayments)
router.get("/reviews", authenticate, authorize("admin"), adminController.getAllReviews)
router.delete("/reviews/:id", authenticate, authorize("admin"), adminController.deleteReview)
router.get("/settings", authenticate, authorize("admin"), adminController.getSiteSettings)
router.put("/settings", authenticate, authorize("admin"), adminController.updateSiteSettings)

module.exports = router

