require("dotenv").config()
const app = require("./config/server")
const { testConnection, sequelize } = require("./config/db")
const logger = require("./utils/logger")
const fs = require("fs")
const path = require("path")

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, "logs")
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir)
}

// Start server
const PORT = process.env.PORT || 3000

const startServer = async () => {
  try {
    // Test database connection
    await testConnection()

    // Sync database models (in development only)
    // if (process.env.NODE_ENV === "development") {
    //   await sequelize.sync({ alter: true })
    //   logger.info("Database synced")
    // }

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`)
    })
  } catch (error) {
    logger.error("Failed to start server:", error)
    process.exit(1)
  }
}

startServer()

