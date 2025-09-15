import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";
import cloudinary from "../config/cloudinary.js"; // nếu dùng Cloudinary
import { DEFAULT_AVATAR } from "../config/constants.js";



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
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// ==============================
// Lấy thông tin user (profile)
// ==============================
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) return res.status(404).json({ message: "User không tồn tại" });

    res.json({
      code: 200,
      message: "Lấy thông tin thành công",
      data: { user: userResponse(user) },
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// ==============================
// Đổi mật khẩu
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
    if (!user) return res.status(404).json({ message: "User không tồn tại" });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu cũ không đúng" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({ message: "Đổi mật khẩu thành công" });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

    return res.json({
      code: 200,
      message: "Cập nhật profile thành công",
      data: { user: userResponse(updatedUser) },
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};


// ==============================
// Xem lịch sử đăng nhập
// ==============================
export const getLoginHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const history = await prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10, // chỉ lấy 10 lần gần nhất, tránh quá tải
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

    res.json({
      code: 200,
      message: "Lấy lịch sử đăng nhập thành công",
      data: history,
    });
  } catch (error) {
    console.error("Get login history error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
