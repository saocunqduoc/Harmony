const { sequelize } = require("../config/db")
const { DataTypes } = require("sequelize")

// Import models
const User = require("./user.model")(sequelize, DataTypes)
const UserProfile = require("./userProfile.model")(sequelize, DataTypes)
const Role = require("./role.model")(sequelize, DataTypes)
const UserRole = require("./userRole.model")(sequelize, DataTypes)
const Business = require("./business.model")(sequelize, DataTypes)
const BusinessUser = require("./businessUser.model")(sequelize, DataTypes)
const EmployeeSchedule = require("./employeeSchedule.model")(sequelize, DataTypes)
const EmployeeLeave = require("./employeeLeave.model")(sequelize, DataTypes)
const ServiceCategory = require("./serviceCategory.model")(sequelize, DataTypes)
const Service = require("./service.model")(sequelize, DataTypes)
const ServiceImage = require("./serviceImage.model")(sequelize, DataTypes)
const ServiceReview = require("./serviceReview.model")(sequelize, DataTypes)
const Booking = require("./booking.model")(sequelize, DataTypes)
const BookingService = require("./bookingService.model")(sequelize, DataTypes)
const BookingAssignedStaff = require("./bookingAssignedStaff.model")(sequelize, DataTypes)
const Payment = require("./payment.model")(sequelize, DataTypes)
const Invoice = require("./invoice.model")(sequelize, DataTypes)
const Admin = require("./admin.model")(sequelize, DataTypes)
const SiteSetting = require("./siteSetting.model")(sequelize, DataTypes)
const Log = require("./log.model")(sequelize, DataTypes)
const Notification = require("./notification.model")(sequelize, DataTypes)

// Define associations
User.hasOne(UserProfile, { foreignKey: "user_id", as: "profile" })
UserProfile.belongsTo(User, { foreignKey: "user_id" })

User.belongsToMany(Role, { through: UserRole, foreignKey: "user_id", as: "roles" })
Role.belongsToMany(User, { through: UserRole, foreignKey: "role_id", as: "users" })

User.hasMany(Business, { foreignKey: "owner_id", as: "ownedBusinesses" })
Business.belongsTo(User, { foreignKey: "owner_id", as: "owner" })

Business.belongsToMany(User, { through: BusinessUser, foreignKey: "business_id", as: "employees" })
User.belongsToMany(Business, { through: BusinessUser, foreignKey: "user_id", as: "employedAt" })
Role.hasMany(BusinessUser, { foreignKey: "role_id" })
BusinessUser.belongsTo(Role, { foreignKey: "role_id" })

User.hasMany(EmployeeSchedule, { foreignKey: "employee_id", as: "schedules" })
EmployeeSchedule.belongsTo(User, { foreignKey: "employee_id", as: "employee" })
Business.hasMany(EmployeeSchedule, { foreignKey: "business_id" })
EmployeeSchedule.belongsTo(Business, { foreignKey: "business_id" })

User.hasMany(EmployeeLeave, { foreignKey: "employee_id", as: "leaves" })
EmployeeLeave.belongsTo(User, { foreignKey: "employee_id", as: "employee" })
Business.hasMany(EmployeeLeave, { foreignKey: "business_id" })
EmployeeLeave.belongsTo(Business, { foreignKey: "business_id" })

ServiceCategory.hasMany(Service, { foreignKey: "category_id" })
Service.belongsTo(ServiceCategory, { foreignKey: "category_id", as: "category" })

Business.hasMany(Service, { foreignKey: "business_id" })
Service.belongsTo(Business, { foreignKey: "business_id" })

Service.hasMany(ServiceImage, { foreignKey: "service_id", as: "images" })
ServiceImage.belongsTo(Service, { foreignKey: "service_id" })

Service.hasMany(ServiceReview, { foreignKey: "service_id", as: "reviews" })
ServiceReview.belongsTo(Service, { foreignKey: "service_id" })
User.hasMany(ServiceReview, { foreignKey: "user_id" })
ServiceReview.belongsTo(User, { foreignKey: "user_id" })

User.hasMany(Booking, { foreignKey: "user_id" })
Booking.belongsTo(User, { foreignKey: "user_id" })
Business.hasMany(Booking, { foreignKey: "business_id" })
Booking.belongsTo(Business, { foreignKey: "business_id" })

Booking.hasMany(BookingService, { foreignKey: "booking_id", as: "services" })
BookingService.belongsTo(Booking, { foreignKey: "booking_id" })
Service.hasMany(BookingService, { foreignKey: "service_id" })
BookingService.belongsTo(Service, { foreignKey: "service_id" })

Booking.hasMany(BookingAssignedStaff, { foreignKey: "booking_id", as: "assignedStaff" })
BookingAssignedStaff.belongsTo(Booking, { foreignKey: "booking_id" })
User.hasMany(BookingAssignedStaff, { foreignKey: "staff_id" })
BookingAssignedStaff.belongsTo(User, { foreignKey: "staff_id", as: "staff" })

Booking.hasOne(Payment, { foreignKey: "booking_id" })
Payment.belongsTo(Booking, { foreignKey: "booking_id" })
User.hasMany(Payment, { foreignKey: "user_id" })
Payment.belongsTo(User, { foreignKey: "user_id" })

Payment.hasOne(Invoice, { foreignKey: "payment_id" })
Invoice.belongsTo(Payment, { foreignKey: "payment_id" })

User.hasOne(Admin, { foreignKey: "user_id" })
Admin.belongsTo(User, { foreignKey: "user_id" })

User.hasMany(Log, { foreignKey: "user_id" })
Log.belongsTo(User, { foreignKey: "user_id" })

User.hasMany(Notification, { foreignKey: "user_id" })
Notification.belongsTo(User, { foreignKey: "user_id" })

module.exports = {
  sequelize,
  User,
  UserProfile,
  Role,
  UserRole,
  Business,
  BusinessUser,
  EmployeeSchedule,
  EmployeeLeave,
  ServiceCategory,
  Service,
  ServiceImage,
  ServiceReview,
  Booking,
  BookingService,
  BookingAssignedStaff,
  Payment,
  Invoice,
  Admin,
  SiteSetting,
  Log,
  Notification,
}

