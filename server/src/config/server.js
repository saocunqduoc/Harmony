const express = require("express")
const cors = require("cors")
const morgan = require("morgan")
const helmet = require("helmet")
const i18n = require("i18n")
const path = require("path")
const { errorHandler } = require("../middlewares/errorHandler.middleware")
const logger = require("../utils/logger")

// Import routes
const authRoutes = require("../routes/auth.routes")
const userRoutes = require("../routes/user.routes")
const serviceRoutes = require("../routes/service.routes")
const businessRoutes = require("../routes/business.routes")
const bookingRoutes = require("../routes/booking.routes")
const paymentRoutes = require("../routes/payment.routes")
const adminRoutes = require("../routes/admin.routes")

// Create Express app
const app = express()

// Security middleware
const corsOptions = {
  origin: [
    'http://localhost:3001',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Origin', 
    'Accept', 
    'X-Requested-With'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Thêm middleware xử lý OPTIONS request
app.options('*', cors(corsOptions));

// Thêm middleware để set headers bổ sung
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3001',
  ];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  next();
});

// Cấu hình Helmet cho phép hiển thị ảnh
app.use(helmet({
  crossOriginResourcePolicy: { 
    policy: 'cross-origin' 
  }
}));

// Request logging
app.use(morgan(process.env.NODE_ENV === "development" ? "dev" : "combined"))

// Body parsers
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Internationalization setup
i18n.configure({
  locales: ["en", "vi"],
  directory: path.join(__dirname, "../locales"),
  defaultLocale: "en",
  objectNotation: true,
  updateFiles: false,
  api: {
    __: "t",
    __n: "tn",
  },
})
app.use(i18n.init)

// Set language based on header
app.use((req, res, next) => {
  const lang = req.headers["accept-language"]
  if (lang) {
    req.setLocale(lang)
  }
  next()
})

// API routes
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/services", serviceRoutes)
app.use("/api/businesses", businessRoutes)
app.use("/api/bookings", bookingRoutes)
app.use("/api/payments", paymentRoutes)
app.use("/api/admin", adminRoutes)

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  })
})

// Global error handler
app.use(errorHandler)

// Export the configured app
module.exports = app

