// middleware/auth.js
import jwt from 'jsonwebtoken'
import prisma from '../config/prisma.js'
import { JWT_CONFIG } from '../config/jwt.js'

// Middleware xác thực JWT
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    console.log('Auth middleware - Headers:', {
      authorization: authHeader,
      token: token ? `${token.substring(0, 20)}...` : 'null',
      url: req.url,
      method: req.method
    });

    if (!token) {
      console.log('Auth middleware - No token provided');
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
    
    // Tìm user trong database (chỉ 1 bảng User duy nhất)
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true
        }
      })
    } catch (dbError) {
      console.error('Database error in auth middleware:', dbError)
      // Nếu là lỗi database connection, throw để catch block xử lý
      if (dbError.code === 'P1001' || dbError.message?.includes('connect')) {
        throw dbError
      }
      // Nếu là lỗi khác, return 401 như bình thường
      return res.status(401).json({ 
        success: false, 
        message: 'Token không hợp lệ hoặc user đã bị vô hiệu hóa' 
      })
    }

    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token không hợp lệ hoặc user đã bị vô hiệu hóa' 
      })
    }

    // Phân loại user type dựa trên role
    if (user.role === 'ADMIN') {
      user.userType = 'admin'
    } else {
      user.userType = 'user'
    }

    // Lưu thông tin user vào request
    req.user = user
    console.log('Auth middleware success:', { userId: user.id, role: user.role, userType: user.userType })
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
    
    // Xử lý lỗi database connection
    if (error.code === 'P1001' || error.message?.includes('connect') || error.message?.includes('database')) {
      console.error('Database connection error in auth middleware:', error.message)
      return res.status(500).json({ 
        success: false, 
        message: 'Lỗi kết nối database' 
      })
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Lỗi server',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    })
  }
}

// Middleware kiểm tra quyền admin
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Chưa đăng nhập' 
    })
  }
  
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ 
      success: false, 
      message: 'Không có quyền truy cập' 
    })
  }
  next()
}