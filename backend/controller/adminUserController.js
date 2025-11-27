
import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";
import logger from '../utils/logger.js';

// Chuẩn hoá dữ liệu user trả về
const userResponse = (user) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  avatar: user.avatar,
  role: user.role, // CUSTOMER hoặc ADMIN
  isActive: user.isActive,
  isVerified: user.isVerified,
  emailVerifiedAt: user.emailVerifiedAt,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  orderCount: user.orderCount ?? user._count?.orders ?? 0,
});

// ==============================
// Lấy danh sách người dùng (có phân trang + tìm kiếm)
// ==============================
export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 5, keyword } = req.query;

    const where = keyword
      ? {
          OR: [
            { email: { contains: keyword} },
            { phone: { contains: keyword} },
            { firstName: { contains: keyword } },
            { lastName: { contains: keyword } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { id: "asc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          role: true,
          isActive: true,
          isVerified: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { orders: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      code: 200,
      message: "Lấy danh sách user thành công",
      data: {
        users: items.map(userResponse), 
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('Failed to fetch users', { error: error.message, stack: error.stack });
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};


// ==============================
// Lấy chi tiết 1 user
// ==============================
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        isActive: true,
        isVerified: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) return res.status(404).json({ message: "User không tồn tại" });

    res.json({
      code: 200,
      message: "Lấy chi tiết user thành công",
      data: userResponse(user),
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// ==============================
// Tạo user mới (mặc định mật khẩu: 123456 nếu không nhập)
// ==============================
export const createUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, role, isActive, isVerified } = req.body;

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    // Kiểm tra số điện thoại trùng lặp (nếu có)
    if (phone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone } });
      if (existingPhone) {
        return res.status(400).json({ message: "Số điện thoại đã được sử dụng" });
      }
    }

    // Validate role (CUSTOMER hoặc ADMIN)
    let validRole = "CUSTOMER";
    if (role === "ADMIN" || role === "CUSTOMER") {
      validRole = role;
    }

    // Nếu không nhập mật khẩu thì đặt mặc định là 123456
    const plainPassword = password || "123456";
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        phone: phone || null,
        role: validRole,
        isActive: isActive !== undefined ? isActive : true,
        isVerified: isVerified !== undefined ? isVerified : false,
        emailVerifiedAt: isVerified === true ? new Date() : null,
      },
    });

    res.status(201).json({
      code: 201,
      message: "Tạo user thành công",
      data: userResponse(newUser),
    });
  } catch (error) {
    logger.error('Failed to create user', { error: error.message, stack: error.stack });
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Email hoặc số điện thoại đã tồn tại" });
    }
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};


// ==============================
// Cập nhật user
// ==============================
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, role, isActive, isVerified } = req.body;

    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) return res.status(404).json({ message: "User không tồn tại" });

    // Không cho thay đổi role của chính mình
    if (req.user && req.user.id === parseInt(id) && role && role !== user.role) {
      return res.status(400).json({ message: "Không thể thay đổi quyền của chính bạn" });
    }

    // Chuẩn bị data cập nhật
    const updateData = {};

    if (firstName) {
      updateData.firstName = firstName;
    }

    if (lastName) {
      updateData.lastName = lastName;
    }

    if (phone !== undefined) {
      // Kiểm tra số điện thoại trùng lặp (nếu có và khác với số cũ)
      if (phone && phone !== user.phone) {
        const existingPhone = await prisma.user.findUnique({ where: { phone } });
        if (existingPhone) {
          return res.status(400).json({ message: "Số điện thoại đã được sử dụng" });
        }
      }
      updateData.phone = phone || null;
    }

    // Cập nhật role (nếu có)
    if (role === "ADMIN" || role === "CUSTOMER") {
      updateData.role = role;
    }

    // Cập nhật isActive (nếu có)
    if (isActive === true || isActive === false) {
      // Không cho vô hiệu hóa chính mình
      if (req.user && req.user.id === parseInt(id) && isActive === false) {
        return res.status(400).json({ message: "Không thể vô hiệu hóa tài khoản của chính bạn" });
      }
      updateData.isActive = isActive;
    }

    // Cập nhật isVerified (nếu có)
    if (isVerified === true || isVerified === false) {
      updateData.isVerified = isVerified;
      if (isVerified === true) {
        updateData.emailVerifiedAt = new Date();
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.json({
      code: 200,
      message: "Cập nhật user thành công",
      data: userResponse(updatedUser),
    });
  } catch (error) {
    logger.error('Failed to update user', { error: error.message, stack: error.stack });
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Số điện thoại hoặc email đã tồn tại" });
    }
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

