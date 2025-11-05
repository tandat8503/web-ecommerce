// controller/authController.js
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../config/prisma.js' 
import { JWT_CONFIG } from '../config/jwt.js'
import { DEFAULT_AVATAR } from '../config/constants.js';

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
  const context = { path: 'auth.login' };
  try {
    console.log('START', { ...context, body: { email: req.body?.email } });
    const { email, password } = req.body

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email và password là bắt buộc'
      })
    }

    // Tìm user (chỉ 1 bảng User duy nhất)
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (!user) {
      console.warn('NOT_FOUND_USER', context)
      return res.status(401).json({
        success: false,
        message: 'Email hoặc password không đúng'
      })
    }
    
    // Phân loại user type dựa trên role
    const userType = user.role === 'ADMIN' ? 'admin' : 'user'

    // Kiểm tra user có active không
    if (!user.isActive) {
      console.warn('USER_INACTIVE', { ...context, userId: user.id })
      return res.status(401).json({
        success: false,
        message: 'Tài khoản đã bị vô hiệu hóa'
      })
    }

    // So sánh password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      console.warn('INVALID_PASSWORD', { ...context, userId: user.id })
      return res.status(401).json({
        success: false,
        message: 'Email hoặc password không đúng'
      })
    }

    // Tạo token
    const accessToken = generateAccessToken(user.id)

    //  Ghi lịch sử đăng nhập
    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        loginMethod: "EMAIL_PASSWORD",
        isSuccessful: true
      }
    })

    // Trả về thông tin user (không bao gồm password)
    const userInfo = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      userType: userType
    }

    console.log('END', { ...context, userId: user.id, userType })
    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        user: userInfo,
        accessToken
      }
    })

  } catch (error) {
    console.error('ERROR', { path: 'auth.login', error: error.message })
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    })
  }
}

// ========================================
// LƯU Ý: getProfile() đã được chuyển sang userController.js
// Hãy sử dụng /api/user/profile thay vì /api/auth/profile
// userController.getUserProfile() có đầy đủ logic hơn
// ========================================

// Đăng ký user mới
export const register = async (req, res) => {
  const context = { path: 'auth.register' };
  try {
    console.log('START', { ...context, body: { email: req.body?.email } })
    const { email, password, firstName, lastName, phone } = req.body

    // Validation cơ bản
    if (!email || !password || !firstName || !lastName ) {
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
// Kiểm tra số điện thoại đã tồn tại chưa (nếu có cung cấp)
        if (phone) {
          const existingPhone = await prisma.user.findUnique({
            where: { phone: phone }
          })

          if (existingPhone) {
            return res.status(409).json({
              success: false,
              message: 'Số điện thoại đã được sử dụng'
            })
          }
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
        avatar: DEFAULT_AVATAR,
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

    console.log('END', { ...context, userId: newUser.id })
    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: {
        user: newUser,
        accessToken
      }
    })

  } catch (error) {
    console.error('ERROR', { path: 'auth.register', error: error.message })
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    })
  }
}

// Đăng xuất
export const logout = async (req, res) => {
  const context = { path: 'auth.logout', userId: req.user?.id };
  try {
    console.log('START', context)
    res.json({
      success: true,
      message: 'Đăng xuất thành công'
    })
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message })
    res.status(500).json({
      success: false,
      message: 'Lỗi server'
    })
  } finally {
    console.log('END', context)
  }
}




// Đăng nhập bằng Google
import { OAuth2Client } from "google-auth-library";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ mess: 'Thiếu token từ frontend' });
  }

  try {
    // Xác thực token với Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, given_name, family_name, picture, sub: googleId } = payload;

    // Kiểm tra user đã tồn tại chưa
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Nếu chưa có → tạo mới với ảnh từ Google
      user = await prisma.user.create({
        data: {
          email,
          firstName: given_name || "",
          lastName: family_name || "",
          avatar: picture, // Lưu ảnh từ Google
          googleId,
          isActive: true,
          isVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
    } else {
      // Nếu user đã tồn tại, cập nhật ảnh từ Google nếu có
      if (picture && picture !== user.avatar) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { 
            avatar: picture,
            googleId: googleId || user.googleId,
          },
        });
      }
    }

    // Tạo JWT cho client
    const jwtToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role || "CUSTOMER",
      },
      JWT_CONFIG.secret,
      { expiresIn: "1d" }
    );

    // Trả về thông tin user (bao gồm avatar từ Google)
    const userInfo = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar, // Ảnh từ Google
      role: user.role,
      isActive: user.isActive,
    };

    res.status(200).json({
      success: true,
      message: "Đăng nhập Google thành công",
      data: {
        user: userInfo,
        accessToken: jwtToken,
      },
    });
  } catch (err) {
    console.error("Google Login Failed:", err);
    res.status(401).json({ mess: "Xác thực Google thất bại", error: err.message });
  }
};

