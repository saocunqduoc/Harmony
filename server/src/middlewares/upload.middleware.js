const multer = require("multer")
const { ApiError } = require("./errorHandler.middleware")

// Configure multer for memory storage
const storage = multer.memoryStorage()

// File filter
const fileFilter = (req, file, cb) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    return cb(new ApiError("Only image files are allowed!", 400), false)
  }
  cb(null, true)
}

// Configure upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: fileFilter,
})

module.exports = upload

