const express = require("express")
const router = express.Router()
const authController = require("../controllers/auth.controller")
const { authenticate } = require("../middlewares/auth.middleware")
const {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
} = require("../validations/auth.validation")

// Public routes
router.post("/register", validateRegister, authController.register)
router.post("/login", validateLogin, authController.login)
router.post("/forgot-password", validateForgotPassword, authController.forgotPassword);
router.post("/reset-password", validateResetPassword, authController.resetPassword)

// Protected routes
router.post("/change-password", authenticate, validateChangePassword, authController.changePassword)
router.get("/me", authenticate, authController.getCurrentUser)

module.exports = router

