// controller/adminUserController.js
import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";

// Chuẩn hoá dữ liệu user trả về
const userResponse = (user) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  avatar: user.avatar,
  isActive: user.isActive,
  isVerified: user.isVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
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
    console.error("Get users error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};


// ==============================
// Lấy chi tiết 1 user
// ==============================
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });

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
    const { email, password, firstName, lastName, phone } = req.body;

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
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

    // Nếu không nhập mật khẩu thì đặt mặc định là 123456
    const plainPassword = password || "123456";
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
      },
    });

    res.status(201).json({
      code: 201,
      message: "Tạo user thành công",
      data: userResponse(newUser),
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};


// ==============================
// Cập nhật user
// ==============================
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, isActive, isVerified } = req.body;

    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) return res.status(404).json({ message: "User không tồn tại" });

    // Kiểm tra số điện thoại trùng lặp (nếu có và khác với số cũ)
    if (phone && phone !== user.phone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone } });
      if (existingPhone) {
        return res.status(400).json({ message: "Số điện thoại đã được sử dụng" });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { firstName, lastName, phone, isActive, isVerified },
    });

    res.json({
      code: 200,
      message: "Cập nhật user thành công",
      data: userResponse(updatedUser),
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// ==============================
// Xóa user
// ==============================
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!user) return res.status(404).json({ message: "User không tồn tại" });

    await prisma.user.delete({ where: { id: parseInt(id) } });

    res.json({ code: 200, message: "Xóa user thành công" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
