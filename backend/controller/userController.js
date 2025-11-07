import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";
import cloudinary from "../config/cloudinary.js"; // nếu dùng Cloudinary
import { DEFAULT_AVATAR } from "../config/constants.js";
import logger from '../utils/logger.js';



// Chuẩn hoá dữ liệu user trả về
const userResponse = (user) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  avatar: user.avatar,
  role: user.role, // Thêm role để phân biệt ADMIN vs CUSTOMER
  isActive: user.isActive,
  isVerified: user.isVerified,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// ==============================
// Lấy thông tin user (profile) - Tự động phân biệt ADMIN vs CUSTOMER
// ==============================
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Lấy đầy đủ thông tin user từ database (có phone, avatar, v.v.)
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
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
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy thông tin" });
    }

    // Phân biệt message theo role
    const message = user.role === 'ADMIN' 
      ? "Lấy thông tin admin thành công" 
      : "Lấy thông tin khách hàng thành công";

    res.json({
      code: 200,
      message,
      data: { user: userResponse(user) },
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// ==============================
// Đổi mật khẩu - Tự động phân biệt ADMIN vs CUSTOMER
// ==============================
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Mật khẩu mới và xác nhận không khớp" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Mật khẩu phải ít nhất 8 ký tự" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "Không tìm thấy thông tin" });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu cũ không đúng" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Phân biệt message theo role
    const message = user.role === 'ADMIN' 
      ? "Đổi mật khẩu admin thành công" 
      : "Đổi mật khẩu thành công";

    res.json({ code: 200, message });
  } catch (error) {
    res.status(500).json({ code: 500, error: error.message });
  }
};

// ==============================
// Update profile (firstName, lastName, phone, avatar)
// ==============================
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, phone, removeAvatar } = req.body;
    const file = req.file; // file upload avatar mới (nếu có)

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User không tồn tại" });

    const updateData = {};

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;

    // Nếu có file upload avatar mới
    if (file) {
      if (user.avatarPublicId) {
        await cloudinary.uploader.destroy(user.avatarPublicId, { invalidate: true });
      }
      updateData.avatar = file.path;
      updateData.avatarPublicId = file.filename;
    }

    // Nếu FE gửi cờ removeAvatar = true thì xoá avatar
    if (removeAvatar === "true" || removeAvatar === true) {
      if (user.avatarPublicId) {
        await cloudinary.uploader.destroy(user.avatarPublicId, { invalidate: true });
      }
      updateData.avatar = DEFAULT_AVATAR;
      updateData.avatarPublicId = null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Phân biệt message theo role
    const message = updatedUser.role === 'ADMIN' 
      ? "Cập nhật profile admin thành công" 
      : "Cập nhật profile thành công";

    return res.json({
      code: 200,
      message,
      data: { user: userResponse(updatedUser) },
    });
  } catch (error) {
    logger.error('Failed to update profile', { error: error.message, stack: error.stack });
    res.status(500).json({ code: 500, message: "Lỗi server", error: error.message });
  }
};


// ==============================
// Xem lịch sử đăng nhập - Tự động phân biệt ADMIN vs CUSTOMER
// ==============================
export const getLoginHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Lấy thông tin user để check role
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      select: { role: true }
    });

    // Số lượng lịch sử tùy theo role
    const limit = userRole === 'ADMIN' ? 50 : 10;

    const history = await prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        loginMethod: true,
        ipAddress: true,
        userAgent: true,
        isSuccessful: true,
        failureReason: true,
        createdAt: true,
      },
    });

    // Phân biệt message theo role
    const message = userRole === 'ADMIN' 
      ? "Lấy lịch sử đăng nhập admin thành công" 
      : "Lấy lịch sử đăng nhập thành công";

    res.json({
      code: 200,
      message,
      data: history,
    });
  } catch (error) {
    logger.error('Failed to fetch login history', { error: error.message, stack: error.stack });
    res.status(500).json({ code: 500, message: "Lỗi server", error: error.message });
  }
};



