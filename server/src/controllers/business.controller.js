const {
  Business,
  User,
  BusinessUser,
  Role,
  Service,
  ServiceImage,
  EmployeeSchedule,
  EmployeeLeave,
} = require("../models")
const { ApiError } = require("../middlewares/errorHandler.middleware")
const ApiResponse = require("../utils/apiResponse")
const uploadService = require("../services/upload.service")
const logger = require("../utils/logger")
const { Op } = require("sequelize")
const { checkBusinessPermission } = require("../helpers/permission.helper")
const { createPaginationMeta, calculateOffset } = require("../helpers/pagination.helper")

// Get all businesses
exports.getAllBusinesses = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query
    const offset = calculateOffset(page, limit)

    let whereClause = {}
    if (search) {
      whereClause = {
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
          { address: { [Op.like]: `%${search}%` } },
        ],
      }
    }

    const { count, rows: businesses } = await Business.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "owner",
          attributes: ["id", "name", "email"],
        },
      ],
      limit: Number.parseInt(limit),
      offset: offset,
      order: [["name", "ASC"]],
    })

    const pagination = createPaginationMeta(count, page, limit)

    res.status(200).json(
      ApiResponse.success("Businesses retrieved successfully", {
        businesses,
        pagination,
      }),
    )
  } catch (error) {
    next(error)
  }
}

// Get business by ID
exports.getBusinessById = async (req, res, next) => {
  try {
    const { id } = req.params

    const business = await Business.findByPk(id, {
      include: [
        {
          model: User,
          as: "owner",
          attributes: ["id", "name", "email"],
        },
        {
          model: User,
          as: "employees",
          attributes: ["id", "name", "email", "phone"],
          through: {
            attributes: ["id"],
            include: [
              {
                model: Role,
                attributes: ["id", "name"],
              },
            ],
          },
        },
        {
          model: Service,
          include: [
            {
              model: ServiceImage,
              as: "images",
            },
          ],
        },
      ],
    })

    if (!business) {
      throw new ApiError("Business not found", 404)
    }

    res.status(200).json(ApiResponse.success("Business retrieved successfully", { business }))
  } catch (error) {
    next(error)
  }
}

// Create business (Owner)
exports.createBusiness = async (req, res, next) => {
  try {
    const { name, description, address, open_time, close_time } = req.body

    const userId = req.user.id

    // Create business
    const business = await Business.create({
      name,
      description,
      owner_id: userId,
      address,
      open_time,
      close_time,
    })

    // Log the creation
    logger.info(`Business created: ${business.name} by user ID ${userId}`)

    res.status(201).json(ApiResponse.success("Business created successfully", { business }))
  } catch (error) {
    next(error)
  }
}

// Update business (Owner)
exports.updateBusiness = async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, description, address, open_time, close_time } = req.body

    const userId = req.user.id

    // Find business
    const business = await Business.findByPk(id)

    if (!business) {
      throw new ApiError("Business not found", 404)
    }

    // Check if user is the owner
    if (business.owner_id !== userId) {
      throw new ApiError("You do not have permission to update this business", 403)
    }

    // Update business
    if (name) business.name = name
    if (description) business.description = description
    if (address) business.address = address
    if (open_time) business.open_time = open_time
    if (close_time) business.close_time = close_time

    await business.save()

    // Log the update
    logger.info(`Business updated: ${business.name} (ID: ${business.id}) by user ID ${userId}`)

    res.status(200).json(ApiResponse.success("Business updated successfully", { business }))
  } catch (error) {
    next(error)
  }
}

// Upload business logo (Owner)
exports.uploadBusinessLogo = async (req, res, next) => {
  try {
    const { id } = req.params

    if (!req.file) {
      throw new ApiError("No file uploaded", 400)
    }

    const userId = req.user.id

    // Find business
    const business = await Business.findByPk(id)

    if (!business) {
      throw new ApiError("Business not found", 404)
    }

    // Check if user is the owner
    if (business.owner_id !== userId) {
      throw new ApiError("You do not have permission to update this business", 403)
    }

    // Upload to Cloudinary
    const result = await uploadService.uploadBusinessLogo(req.file.buffer, id)

    // Update business
    business.logo_url = result.secure_url
    await business.save()

    // Log the upload
    logger.info(`Business logo uploaded for business ID ${id} by user ID ${userId}`)

    res.status(200).json(
      ApiResponse.success("Business logo uploaded successfully", {
        logo_url: result.secure_url,
      }),
    )
  } catch (error) {
    next(error)
  }
}

// Upload business cover image (Owner)
exports.uploadBusinessCoverImage = async (req, res, next) => {
  try {
    const { id } = req.params

    if (!req.file) {
      throw new ApiError("No file uploaded", 400)
    }

    const userId = req.user.id

    // Find business
    const business = await Business.findByPk(id)

    if (!business) {
      throw new ApiError("Business not found", 404)
    }

    // Check if user is the owner
    if (business.owner_id !== userId) {
      throw new ApiError("You do not have permission to update this business", 403)
    }

    // Upload to Cloudinary
    const result = await uploadService.uploadBuffer(req.file.buffer, "businesses/covers", `cover_${id}_${Date.now()}`)

    // Update business
    business.cover_image_url = result.secure_url
    await business.save()

    // Log the upload
    logger.info(`Business cover image uploaded for business ID ${id} by user ID ${userId}`)

    res.status(200).json(
      ApiResponse.success("Business cover image uploaded successfully", {
        cover_image_url: result.secure_url,
      }),
    )
  } catch (error) {
    next(error)
  }
}

// Add employee to business (Owner/Manager)
exports.addEmployee = async (req, res, next) => {
  try {
    const { id } = req.params
    const { email, role_id } = req.body

    const userId = req.user.id

    // Find business
    const business = await Business.findByPk(id)

    if (!business) {
      throw new ApiError("Business not found", 404)
    }

    // Check if user has permission
    const hasPermission = await checkBusinessPermission(userId, id, ["owner", "manager"])
    if (!hasPermission) {
      throw new ApiError("You do not have permission to add employees to this business", 403)
    }

    // Find user by email
    const user = await User.findOne({ where: { email } })

    if (!user) {
      throw new ApiError("User not found", 404)
    }

    // Check if role exists
    const role = await Role.findByPk(role_id)

    if (!role) {
      throw new ApiError("Role not found", 404)
    }

    // Check if user is already an employee
    const existingEmployee = await BusinessUser.findOne({
      where: {
        business_id: id,
        user_id: user.id,
      },
    })

    if (existingEmployee) {
      throw new ApiError("User is already an employee of this business", 400)
    }

    // Add employee
    await BusinessUser.create({
      business_id: id,
      user_id: user.id,
      role_id,
    })

    // Log the addition
    logger.info(
      `Employee added to business: Business ID ${id}, User ID ${user.id}, Role ID ${role_id} by user ID ${userId}`,
    )

    res.status(201).json(ApiResponse.success("Employee added successfully"))
  } catch (error) {
    next(error)
  }
}

// Update employee role (Owner/Manager)
exports.updateEmployeeRole = async (req, res, next) => {
  try {
    const { id, employeeId } = req.params
    const { role_id } = req.body

    const userId = req.user.id

    // Find business
    const business = await Business.findByPk(id)

    if (!business) {
      throw new ApiError("Business not found", 404)
    }

    // Check if user has permission
    const hasPermission = await checkBusinessPermission(userId, id, ["owner", "manager"])
    if (!hasPermission) {
      throw new ApiError("You do not have permission to update employee roles for this business", 403)
    }

    // Check if role exists
    const role = await Role.findByPk(role_id)

    if (!role) {
      throw new ApiError("Role not found", 404)
    }

    // Find employee
    const employee = await BusinessUser.findOne({
      where: {
        business_id: id,
        user_id: employeeId,
      },
    })

    if (!employee) {
      throw new ApiError("Employee not found", 404)
    }

    // Update role
    employee.role_id = role_id
    await employee.save()

    // Log the update
    logger.info(
      `Employee role updated: Business ID ${id}, User ID ${employeeId}, Role ID ${role_id} by user ID ${userId}`,
    )

    res.status(200).json(ApiResponse.success("Employee role updated successfully"))
  } catch (error) {
    next(error)
  }
}

// Remove employee from business (Owner/Manager)
exports.removeEmployee = async (req, res, next) => {
  try {
    const { id, employeeId } = req.params

    const userId = req.user.id

    // Find business
    const business = await Business.findByPk(id)

    if (!business) {
      throw new ApiError("Business not found", 404)
    }

    // Check if user has permission
    const hasPermission = await checkBusinessPermission(userId, id, ["owner", "manager"])
    if (!hasPermission) {
      throw new ApiError("You do not have permission to remove employees from this business", 403)
    }

    // Find employee
    const employee = await BusinessUser.findOne({
      where: {
        business_id: id,
        user_id: employeeId,
      },
    })

    if (!employee) {
      throw new ApiError("Employee not found", 404)
    }

    // Check if trying to remove the owner
    if (business.owner_id === Number.parseInt(employeeId)) {
      throw new ApiError("Cannot remove the business owner", 400)
    }

    // Remove employee
    await employee.destroy()

    // Log the removal
    logger.info(`Employee removed from business: Business ID ${id}, User ID ${employeeId} by user ID ${userId}`)

    res.status(200).json(ApiResponse.success("Employee removed successfully"))
  } catch (error) {
    next(error)
  }
}

// Get employee schedule (Owner/Manager/Employee)
exports.getEmployeeSchedule = async (req, res, next) => {
  try {
    const { id, employeeId } = req.params
    const { startDate, endDate } = req.query

    const userId = req.user.id

    // Find business
    const business = await Business.findByPk(id)

    if (!business) {
      throw new ApiError("Business not found", 404)
    }

    // Check if user has permission
    const isOwnerOrManager = await checkBusinessPermission(userId, id, ["owner", "manager"])
    const isSelf = userId === Number.parseInt(employeeId)

    if (!isOwnerOrManager && !isSelf) {
      throw new ApiError("You do not have permission to view this schedule", 403)
    }

    // Build query
    const whereClause = {
      employee_id: employeeId,
      business_id: id,
    }

    if (startDate && endDate) {
      whereClause.work_date = {
        [Op.between]: [startDate, endDate],
      }
    } else if (startDate) {
      whereClause.work_date = {
        [Op.gte]: startDate,
      }
    } else if (endDate) {
      whereClause.work_date = {
        [Op.lte]: endDate,
      }
    }

    // Get schedule
    const schedule = await EmployeeSchedule.findAll({
      where: whereClause,
      order: [["work_date", "ASC"]],
    })

    // Get leaves
    const leaves = await EmployeeLeave.findAll({
      where: {
        employee_id: employeeId,
        business_id: id,
        ...(startDate && endDate ? { leave_date: { [Op.between]: [startDate, endDate] } } : {}),
        ...(startDate && !endDate ? { leave_date: { [Op.gte]: startDate } } : {}),
        ...(!startDate && endDate ? { leave_date: { [Op.lte]: endDate } } : {}),
      },
      order: [["leave_date", "ASC"]],
    })

    res.status(200).json(
      ApiResponse.success("Employee schedule retrieved successfully", {
        schedule,
        leaves,
      }),
    )
  } catch (error) {
    next(error)
  }
}

// Set employee schedule (Owner/Manager)
exports.setEmployeeSchedule = async (req, res, next) => {
  try {
    const { id, employeeId } = req.params
    const { schedules } = req.body

    const userId = req.user.id

    // Find business
    const business = await Business.findByPk(id)

    if (!business) {
      throw new ApiError("Business not found", 404)
    }

    // Check if user has permission
    const hasPermission = await checkBusinessPermission(userId, id, ["owner", "manager"])
    if (!hasPermission) {
      throw new ApiError("You do not have permission to set employee schedules for this business", 403)
    }

    // Check if employee exists
    const employee = await BusinessUser.findOne({
      where: {
        business_id: id,
        user_id: employeeId,
      },
    })

    if (!employee) {
      throw new ApiError("Employee not found", 404)
    }

    // Validate schedules
    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
      throw new ApiError("Invalid schedules data", 400)
    }

    // Process each schedule
    const createdSchedules = []

    for (const schedule of schedules) {
      const { work_date, start_time, end_time } = schedule

      // Validate required fields
      if (!work_date || !start_time || !end_time) {
        throw new ApiError("Each schedule must have work_date, start_time, and end_time", 400)
      }

      // Check if schedule already exists for this date
      const existingSchedule = await EmployeeSchedule.findOne({
        where: {
          employee_id: employeeId,
          business_id: id,
          work_date,
        },
      })

      if (existingSchedule) {
        // Update existing schedule
        existingSchedule.start_time = start_time
        existingSchedule.end_time = end_time
        await existingSchedule.save()
        createdSchedules.push(existingSchedule)
      } else {
        // Create new schedule
        const newSchedule = await EmployeeSchedule.create({
          employee_id: employeeId,
          business_id: id,
          work_date,
          start_time,
          end_time,
        })
        createdSchedules.push(newSchedule)
      }
    }

    // Log the update
    logger.info(`Employee schedule set: Business ID ${id}, User ID ${employeeId} by user ID ${userId}`)

    res.status(200).json(
      ApiResponse.success("Employee schedule set successfully", {
        schedules: createdSchedules,
      }),
    )
  } catch (error) {
    next(error)
  }
}

// Request leave (Employee)
exports.requestLeave = async (req, res, next) => {
  try {
    const { id } = req.params
    const { leave_date, reason } = req.body

    const userId = req.user.id

    // Find business
    const business = await Business.findByPk(id)

    if (!business) {
      throw new ApiError("Business not found", 404)
    }

    // Check if user is an employee
    const employee = await BusinessUser.findOne({
      where: {
        business_id: id,
        user_id: userId,
      },
    })

    if (!employee) {
      throw new ApiError("You are not an employee of this business", 403)
    }

    // Check if leave already requested for this date
    const existingLeave = await EmployeeLeave.findOne({
      where: {
        employee_id: userId,
        business_id: id,
        leave_date,
      },
    })

    if (existingLeave) {
      throw new ApiError("Leave already requested for this date", 400)
    }

    // Create leave request
    const leave = await EmployeeLeave.create({
      employee_id: userId,
      business_id: id,
      leave_date,
      reason,
      status: "pending",
    })

    // Log the request
    logger.info(`Leave requested: Business ID ${id}, User ID ${userId}, Date ${leave_date}`)

    res.status(201).json(ApiResponse.success("Leave requested successfully", { leave }))
  } catch (error) {
    next(error)
  }
}

// Approve/reject leave (Owner/Manager)
exports.updateLeaveStatus = async (req, res, next) => {
  try {
    const { id, leaveId } = req.params
    const { status } = req.body

    const userId = req.user.id

    // Validate status
    if (status !== "approved" && status !== "rejected") {
      throw new ApiError('Status must be either "approved" or "rejected"', 400)
    }

    // Find business
    const business = await Business.findByPk(id)

    if (!business) {
      throw new ApiError("Business not found", 404)
    }

    // Check if user has permission
    const hasPermission = await checkBusinessPermission(userId, id, ["owner", "manager"])
    if (!hasPermission) {
      throw new ApiError("You do not have permission to update leave status for this business", 403)
    }

    // Find leave request
    const leave = await EmployeeLeave.findOne({
      where: {
        id: leaveId,
        business_id: id,
      },
    })

    if (!leave) {
      throw new ApiError("Leave request not found", 404)
    }

    // Update status
    leave.status = status
    await leave.save()

    // Log the update
    logger.info(`Leave status updated: Leave ID ${leaveId}, Status ${status} by user ID ${userId}`)

    res.status(200).json(ApiResponse.success("Leave status updated successfully", { leave }))
  } catch (error) {
    next(error)
  }
}

// Get user's businesses (Owner)
exports.getUserBusinesses = async (req, res, next) => {
  try {
    const userId = req.user.id

    const businesses = await Business.findAll({
      where: { owner_id: userId },
      include: [
        {
          model: User,
          as: "employees",
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
    })

    res.status(200).json(ApiResponse.success("User businesses retrieved successfully", { businesses }))
  } catch (error) {
    next(error)
  }
}

// Get businesses where user is employed (Employee)
exports.getEmployedBusinesses = async (req, res, next) => {
  try {
    const userId = req.user.id

    const businesses = await Business.findAll({
      include: [
        {
          model: User,
          as: "employees",
          where: { id: userId },
          attributes: [],
          through: { attributes: [] },
        },
      ],
    })

    res.status(200).json(ApiResponse.success("Employed businesses retrieved successfully", { businesses }))
  } catch (error) {
    next(error)
  }
}

