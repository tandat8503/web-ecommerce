// server.js
import dotenv from 'dotenv'
// Load environment variables
dotenv.config()
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import prisma from './config/prisma.js'
import Routes from './routes/index.js'
import { ensureFullTextIndex } from './utils/fulltextSearch.js'

const app = express()
const PORT = process.env.PORT || 5000

// --- Security middleware ---
app.use(helmet())

// --- CORS CONFIGURATION ---
// Chỗ mới: sửa lỗi crash preflight và cho phép FE kết nối
const allowedOrigins = [
  'https://web-ecommerce-rosy.vercel.app', // FE đã deploy
  'http://localhost:5173'                  // FE local
]

app.use(cors({
  origin: function(origin, callback) {
    // Cho phép request không có origin (ví dụ Postman, curl)
    if (!origin) return callback(null, true)

    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    } else {
      return callback(new Error('CORS blocked by server'), false)
    }
  },
  credentials: true,             // nếu dùng cookie
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}))

// --- Chỗ mới: Xoá app.options('*') gây crash
// Express + cors middleware tự động xử lý OPTIONS preflight

// --- Rate limiting ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 200, // Giới hạn 200 requests
  message: 'Quá nhiều requests, vui lòng thử lại sau'
})
app.use(limiter)

// --- Body parsing ---
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// --- Routes ---
Routes(app)

// --- Health check ---
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  })
})

// --- Test database connection ---
app.get('/api/test-db', async (req, res) => {
  try {
    await prisma.$connect()
    res.json({ 
      success: true, 
      message: 'Database connected successfully' 
    })
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Database connection failed',
      error: error.message 
    })
  }
})

// --- Error handling ---
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message)
  console.error('📍 Path:', req.path)
  console.error('📋 Stack:', err.stack)

  // Xử lý Prisma errors cụ thể
  if (err.code === 'P1001') {
    // Database connection error
    console.error('Database connection error')
    return res.status(503).json({
      success: false,
      message: 'Không thể kết nối đến database. Vui lòng thử lại sau.',
    })
  }

  if (err.code === 'P2002') {
    // Unique constraint violation
    return res.status(409).json({
      success: false,
      message: 'Dữ liệu đã tồn tại',
      error: err.meta?.target ? `Trường ${err.meta.target.join(', ')} đã tồn tại` : err.message
    })
  }

  if (err.code === 'P2025') {
    // Record not found
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy dữ liệu',
    })
  }

  // Xử lý timeout errors
  if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
    console.error('thời gian chờ request vượt quá giới hạn')
    return res.status(504).json({
      success: false,
      message: 'Request timeout. Vui lòng thử lại.',
    })
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV !== 'production' ? err.message : undefined,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  })
})

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  })
})

// --- Graceful shutdown ---
process.on('SIGINT', async () => {
  console.log('Shutting down server...')
  await prisma.$disconnect()
  process.exit(0)
})

// --- Start server ---
const startServer = async () => {
  try {
    // Kiểm tra kết nối database trước khi start server
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    
    // Đảm bảo FullText index đã được tạo
    await ensureFullTextIndex()
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
      console.log(`🌐 Health check: http://localhost:${PORT}/api/health`)
      console.log(`🗄️  Database test: http://localhost:${PORT}/api/test-db`)
      console.log(`🟢 Auth endpoints: http://localhost:${PORT}/api/auth`)
    })
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message)
    console.error('Please check your DATABASE_URL in .env file')
    process.exit(1)
  }
}

startServer()
