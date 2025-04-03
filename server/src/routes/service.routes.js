const express = require("express")
const router = express.Router()
const serviceController = require("../controllers/service.controller")
const { authenticate, authorize } = require("../middlewares/auth.middleware")
const upload = require("../middlewares/upload.middleware")
const {
  validateCreateService,
  validateUpdateService,
  validateServiceReview,
} = require("../validations/service.validation")

// Public routes
router.get("/", serviceController.getAllServices)
router.get("/:id", serviceController.getServiceById)
router.get("/:id/reviews", serviceController.getServiceReviews)

// Protected routes
router.post("/", authenticate, authorize("owner", "manager"), validateCreateService, serviceController.createService)
router.put("/:id", authenticate, authorize("owner", "manager"), validateUpdateService, serviceController.updateService)
router.delete("/:id", authenticate, authorize("owner", "manager"), serviceController.deleteService)
router.post(
  "/:id/images",
  authenticate,
  authorize("owner", "manager"),
  upload.single("image"),
  serviceController.uploadServiceImage,
)
router.delete("/:id/images/:imageId", authenticate, authorize("owner", "manager"), serviceController.deleteServiceImage)
router.post("/:id/reviews", authenticate, validateServiceReview, serviceController.addServiceReview)

module.exports = router

