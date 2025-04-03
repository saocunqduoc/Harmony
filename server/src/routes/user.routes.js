const express = require("express")
const router = express.Router()
const userController = require("../controllers/user.controller")
const { authenticate, authorize } = require("../middlewares/auth.middleware")
const upload = require("../middlewares/upload.middleware")
const { validateUpdateProfile } = require("../validations/user.validation")

// User routes
router.get("/profile", authenticate, userController.getUserProfile)
router.put("/profile", authenticate, validateUpdateProfile, userController.updateUserProfile)
router.post("/profile/avatar", authenticate, upload.single("avatar_url"), userController.uploadProfilePicture)
router.get("/bookings", authenticate, userController.getUserBookings)

// Admin routes
router.get("/", authenticate, authorize("admin"), userController.getAllUsers)
router.put("/:userId/roles", authenticate, authorize("admin"), userController.updateUserRoles)

module.exports = router

