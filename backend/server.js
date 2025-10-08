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

// Security middleware
app.use(helmet())
app.use(cors({
  origin: [
    'https://web-ecommerce-three.vercel.app',
    'https://web-ecommerce-git-main-lylys-projects-19de6e97.vercel.app',
    'http://localhost:5173'
  ],
  credentials: true
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // Giới hạn 100 requests
  message: 'Quá nhiều requests, vui lòng thử lại sau'
})
app.use(limiter)

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Routes
//app.use('/api/auth', authRoutes)
Routes(app)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  })
})

// Test database connection
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

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  })
})

// 404 handler - SỬA LỖI Ở ĐÂY
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  })
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...')
  await prisma.$disconnect()
  process.exit(0)
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`)
  console.log(`🗄️  Database test: http://localhost:${PORT}/api/test-db`)
  console.log(`�� Auth endpoints: http://localhost:${PORT}/api/auth`)
})