const { sequelize, Role, ServiceCategory, User, UserRole, Admin, SiteSetting } = require("../models")
const logger = require("../utils/logger")

const initializeDatabase = async () => {
  try {
    // Sync database models
    await sequelize.sync({ force: true })
    logger.info("Database synchronized")

    // Create default roles
    const roles = [
      { name: "admin" },
      { name: "owner" },
      { name: "staff" },
      { name: "customer" },
    ]

    await Role.bulkCreate(roles)
    logger.info("Default roles created")

    // Create default service categories
    const categories = [
      { name: "Spa" },
      { name: "Hair Salon" },
      { name: "Nail Salon" },
      { name: "Massage" },
      { name: "Yoga" },
      { name: "Gym" },
      { name: "Makeup" },
      { name: "Other" },
    ]

    await ServiceCategory.bulkCreate(categories)
    logger.info("Default service categories created")

    // Create admin user
    const adminPassword = "admin123" // Change this in production
    const admin = await User.create({
      name: "Admin",
      email: "admin@harmony.com",
      password: adminPassword,
      phone: "1234567890",
    })

    // Assign admin role
    const adminRole = await Role.findOne({ where: { name: "admin" } })
    await UserRole.create({
      user_id: admin.id,
      role_id: adminRole.id,
    })

    // Create admin record
    await Admin.create({
      user_id: admin.id,
    })

    logger.info("Admin user created")

    // Create default site settings
    const settings = [
      { key: "site_name", value: "Harmony" },
      { key: "site_description", value: "Book services online" },
      { key: "contact_email", value: "contact@harmony.com" },
      { key: "contact_phone", value: "1234567890" },
      { key: "currency", value: "USD" },
      { key: "booking_lead_time", value: "1" }, // days
      { key: "booking_future_limit", value: "30" }, // days
      { key: "maintenance_mode", value: "false" },
    ]

    await SiteSetting.bulkCreate(settings)
    logger.info("Default site settings created")

    logger.info("Database initialization completed successfully")
  } catch (error) {
    logger.error("Database initialization failed:", error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase()
}

module.exports = { initializeDatabase }

