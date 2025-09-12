// controller/authController.js
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { JWT_CONFIG } from '../config/jwt.js'

const prisma = new PrismaClient()

// Tạo access token
const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId, type: 'access' },
    JWT_CONFIG.secret,
    { expiresIn: JWT_CONFIG.expiresIn }
  )
}

// Đăng nhập
export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email và password là bắt buộc'
      })
    }

    // Tìm user (có thể là admin hoặc user thường)
    let user = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase() }
    })
    let userType = 'admin'

    // Nếu không tìm thấy admin, tìm user thường
    if (!user) {
      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      })
      userType = 'user'
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc password không đúng'
      })
    }

    // Kiểm tra user có active không
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản đã bị vô hiệu hóa'
      })
    }

    // So sánh password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc password không đúng'
      })
    }

    // Tạo token
    const accessToken = generateAccessToken(user.id)

    // Trả về thông tin user (không bao gồm password)
    const userInfo = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role || 'USER',
      isActive: user.isActive,
      userType: userType
    }

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        user: userInfo,
        accessToken
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    })
  }
}

// Lấy thông tin user hiện tại
export const getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Lấy thông tin profile thành công',
      data: {
        user: req.user
      }
    })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    })
  }
}

// Đăng ký user mới
export const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body

    // Validation cơ bản
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, firstName và lastName là bắt buộc'
      })
    }

    // Kiểm tra email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email không đúng định dạng'
      })
    }

    // Kiểm tra password độ dài
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password phải có ít nhất 6 ký tự'
      })
    }

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email đã được sử dụng'
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Tạo user mới
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone || null,
        isActive: true,
        isVerified: false
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        isVerified: true,
        createdAt: true
      }
    })

    // Tạo access token
    const accessToken = generateAccessToken(newUser.id)

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: {
        user: newUser,
        accessToken
      }
    })

  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    })
  }
}

// Đăng xuất
export const logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Đăng xuất thành công'
    })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    })
  }
}