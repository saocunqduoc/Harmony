const express = require("express")
const router = express.Router()
const paymentController = require("../controllers/payment.controller")
const { authenticate, authorize } = require("../middlewares/auth.middleware")
const { validateCreatePayment } = require("../validations/payment.validation")

// User routes
router.post("/", authenticate, validateCreatePayment, paymentController.createPayment)
router.put("/:id/process", authenticate, paymentController.processPayment)
router.get("/user", authenticate, paymentController.getUserPayments)
router.get("/:id", authenticate, paymentController.getPaymentById)

// Business routes
router.get("/business/:businessId", authenticate, paymentController.getBusinessPayments)

module.exports = router

