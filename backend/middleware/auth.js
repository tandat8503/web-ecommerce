// middleware/auth.js
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { JWT_CONFIG } from '../config/jwt.js'

const prisma = new PrismaClient()

// Middleware xác thực JWT
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token không được cung cấp' 
      })
    }

    // Xác thực token
    const decoded = jwt.verify(token, JWT_CONFIG.secret)

    // Lấy userId từ payload (ưu tiên userId, fallback sang id)
    const userId = decoded.userId || decoded.id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ (không có userId)'
      })
    }
    
    // Tìm user trong database (có thể là admin hoặc user thường)
    let user = await prisma.adminUser.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        //userType: 'admin'
      }
    })
    if (user) {
      user.userType = 'admin'
    }

    // Nếu không tìm thấy admin, tìm user thường
    if (!user) {
      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true
        }
      })
      
      if (user) {
        user.role = 'USER'
        user.userType = 'user'
      }
    }

    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token không hợp lệ hoặc user đã bị vô hiệu hóa' 
      })
    }

    // Lưu thông tin user vào request
    req.user = user
    console.log('Auth middleware success:', { userId: user.id, userType: user.userType })
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token không hợp lệ' 
      })
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token đã hết hạn' 
      })
    }

    console.error('Auth middleware error:', error)
    return res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    })
  }
}

// Middleware kiểm tra quyền admin
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ 
      success: false, 
      message: 'Không có quyền truy cập' 
    })
  }
  next()
}