// server.js
import dotenv from 'dotenv'
// Load environment variables
dotenv.config()
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { PrismaClient } from '@prisma/client'
//import authRoutes from './routes/authRoutes.js'
import Routes from './routes/index.js'

const app = express()
const PORT = process.env.PORT || 5000
const prisma = new PrismaClient()

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
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}))

// --- Chỗ mới: Xoá app.options('*') gây crash
// Express + cors middleware tự động xử lý OPTIONS preflight

// --- Rate limiting ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // Giới hạn 100 requests
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
  console.error('Error:', err)
  res.status(500).json({
    success: false,
    message: 'Internal server error'
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
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`)
  console.log(`🗄️  Database test: http://localhost:${PORT}/api/test-db`)
  console.log(`🟢 Auth endpoints: http://localhost:${PORT}/api/auth`)
})
