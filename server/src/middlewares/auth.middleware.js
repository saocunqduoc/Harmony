const jwt = require("jsonwebtoken")
const { ApiError } = require("./errorHandler.middleware")
const { User, Role, UserRole } = require("../models")

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError("Vui lòng đăng nhập.", 401)
    }

    const token = authHeader.split(" ")[1]

    if (!token) {
      throw new ApiError("Vui lòng đăng nhập.", 401)
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await User.findByPk(decoded.id, {
      include: [
        {
          model: Role,
          through: UserRole,
          as: "roles",
        },
      ],
    })

    if (!user) {
      throw new ApiError("Không tìm thấy người dùng.", 404)
    }

    req.user = user
    next()
  } catch (error) {
    next(error)
  }
}

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError("Vui lòng đăng nhập.", 401))
    }

    const userRoles = req.user.roles.map((role) => role.name)

    const hasPermission = allowedRoles.some((role) => userRoles.includes(role))

    if (!hasPermission) {
      return next(new ApiError("Bạn không đủ quyền hạn để truy cập tài nguyên.", 403))
    }

    next()
  }
}

module.exports = {
  authenticate,
  authorize,
}; 