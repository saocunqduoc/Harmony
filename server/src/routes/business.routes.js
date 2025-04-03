const express = require("express")
const router = express.Router()
const businessController = require("../controllers/business.controller")
const { authenticate, authorize } = require("../middlewares/auth.middleware")
const upload = require("../middlewares/upload.middleware")
const { validateCreateBusiness, validateUpdateBusiness } = require("../validations/business.validation")

// Public routes
router.get("/", businessController.getAllBusinesses)
router.get("/:id", businessController.getBusinessById)

// User routes
router.get("/user/owned", authenticate, businessController.getUserBusinesses)
router.get("/user/employed", authenticate, businessController.getEmployedBusinesses)

// Business owner routes
router.post(
  "/",
  authenticate,
  authorize("customer", "owner"),
  validateCreateBusiness,
  businessController.createBusiness,
)
router.put("/:id", authenticate, authorize("owner"), validateUpdateBusiness, businessController.updateBusiness)
router.post("/:id/logo", authenticate, authorize("owner"), upload.single("logo"), businessController.uploadBusinessLogo)
router.post(
  "/:id/cover",
  authenticate,
  authorize("owner"),
  upload.single("cover"),
  businessController.uploadBusinessCoverImage,
)

// Employee management
router.post("/:id/employees", authenticate, authorize("owner", "manager"), businessController.addEmployee)
router.put(
  "/:id/employees/:employeeId",
  authenticate,
  authorize("owner", "manager"),
  businessController.updateEmployeeRole,
)
router.delete(
  "/:id/employees/:employeeId",
  authenticate,
  authorize("owner", "manager"),
  businessController.removeEmployee,
)

// Schedule management
router.get("/:id/employees/:employeeId/schedule", authenticate, businessController.getEmployeeSchedule)
router.post(
  "/:id/employees/:employeeId/schedule",
  authenticate,
  authorize("owner", "manager"),
  businessController.setEmployeeSchedule,
)
router.post("/:id/leave", authenticate, businessController.requestLeave)
router.put("/:id/leave/:leaveId", authenticate, authorize("owner", "manager"), businessController.updateLeaveStatus)

module.exports = router

