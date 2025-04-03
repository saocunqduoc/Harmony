const cloudinary = require("cloudinary").v2
const { Readable } = require("stream")
const logger = require("../utils/logger")

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

class UploadService {
  constructor() {
    this.cloudinary = cloudinary
  }

  async uploadBuffer(buffer, folder, filename) {
    try {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: filename,
            resource_type: "auto",
          },
          (error, result) => {
            if (error) {
              logger.error("Error uploading to Cloudinary", { error, filename })
              return reject(error)
            }
            return resolve(result)
          },
        )

        const readableStream = new Readable()
        readableStream.push(buffer)
        readableStream.push(null)
        readableStream.pipe(uploadStream)
      })
    } catch (error) {
      logger.error("Error in upload service", { error, filename })
      throw error
    }
  }

  async uploadImage(buffer, folder = "images") {
    const filename = `img_${Date.now()}`
    return this.uploadBuffer(buffer, folder, filename)
  }

  async uploadProfileImage(buffer, userId) {
    const filename = `profile_${userId}_${Date.now()}`
    return this.uploadBuffer(buffer, "profiles", filename)
  }

  async uploadBusinessLogo(buffer, businessId) {
    const filename = `logo_${businessId}_${Date.now()}`
    return this.uploadBuffer(buffer, "businesses/logos", filename)
  }

  async uploadServiceImage(buffer, serviceId) {
    const filename = `service_${serviceId}_${Date.now()}`
    return this.uploadBuffer(buffer, "services", filename)
  }

  async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId)
      logger.info("Image deleted from Cloudinary", { publicId, result })
      return result
    } catch (error) {
      logger.error("Error deleting image from Cloudinary", { error, publicId })
      throw error
    }
  }
}

module.exports = new UploadService()

