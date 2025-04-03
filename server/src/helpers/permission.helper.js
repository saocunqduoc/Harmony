const { Business, BusinessUser, Admin, Role } = require("../models")
const { Op } = require("sequelize")

/**
 * Check if a user has permission for a business
 * @param {number} userId - The user ID
 * @param {number} businessId - The business ID
 * @param {Array} roles - Optional array of required roles
 * @returns {Promise<boolean>} - Whether the user has permission
 */
exports.checkBusinessPermission = async (userId, businessId, roles = []) => {
  // Check if user is owner
  const business = await Business.findOne({
    where: {
      id: businessId,
      owner_id: userId,
    },
  })

  if (business) {
    return true
  }

  // If no specific roles are required, or owner is one of the required roles
  if (roles.length === 0 || roles.includes("owner")) {
    return !!business
  }

  // Check if user has one of the required roles
  const roleRecords = await Role.findAll({
    where: {
      name: { [Op.in]: roles },
    },
  })

  const roleIds = roleRecords.map((role) => role.id)

  const businessUser = await BusinessUser.findOne({
    where: {
      business_id: businessId,
      user_id: userId,
      role_id: { [Op.in]: roleIds },
    },
  })

  return !!businessUser
}

/**
 * Check if a user has admin role
 * @param {number} userId - The user ID
 * @returns {Promise<boolean>} - Whether the user is an admin
 */
exports.checkAdminRole = async (userId) => {
  const admin = await Admin.findOne({
    where: { user_id: userId },
  })

  return !!admin
}

/**
 * Check if a user has a specific role
 * @param {number} userId - The user ID
 * @param {string|Array} roleName - Role name or array of role names
 * @returns {Promise<boolean>} - Whether the user has the role
 */
exports.checkUserRole = async (userId, roleName) => {
  const roleNames = Array.isArray(roleName) ? roleName : [roleName]

  const roleCount = await Role.count({
    include: [
      {
        association: "users",
        where: { id: userId },
      },
    ],
    where: {
      name: { [Op.in]: roleNames },
    },
  })

  return roleCount > 0
}

