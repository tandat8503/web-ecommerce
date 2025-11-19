import bcrypt from 'bcryptjs'; // Hash mật khẩu mới
import crypto from 'crypto'; // Tạo OTP và token bảo mật
import prisma from '../config/prisma.js'; 
import logger from '../utils/logger.js'; // Ghi log lỗi/hành trình
import {
  sendForgotPasswordEmail,
} from '../services/Email/EmailServices.js'; 

const OTP_TTL_MIN = 10; // OTP sống 10 phút
const RESET_TTL_HR = 1; // Token reset sống 1 giờ

/**
 * Bước 1: Người dùng yêu cầu quên mật khẩu -> gửi OTP qua email
 */
export const requestPasswordReset = async (req, res) => {
  try {
    // Lấy và chuẩn hóa email từ body
    const email = (req.body.email || '').trim().toLowerCase();
    // Không nhập email -> báo lỗi
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email là bắt buộc.',
      });
    }

    // Helper inline: phản hồi chung để tránh lộ thông tin user tồn tại
    const safeSuccess = () =>
      res.json({
        success: true,
        message: 'Nếu email hợp lệ chúng tôi đã gửi hướng dẫn.',
      });

    // Tìm user trong DB theo email
    const user = await prisma.user.findUnique({ where: { email } });
    // Không tồn tại hoặc bị khóa -> vẫn trả thành công giả
    if (!user || !user.isActive) return safeSuccess();

        // User đăng nhập Google (không có password) -> không hỗ trợ quên mật khẩu
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản đăng nhập Google không hỗ trợ quên mật khẩu.',
      });
    }

    // Sinh OTP ngẫu nhiên 6 chữ số + thời gian hết hạn
    const otpCode = crypto.randomInt(100000, 999999).toString();
    // Thời gian hết hạn của OTP là 10 phút
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);

    // Ghi OTP vào bảng otp_verifications trong transaction
    await prisma.$transaction(async (tx) => {
      // Xóa OTP cũ chưa dùng (nếu có)
      await tx.otpVerification.deleteMany({
        where: {
          userId: user.id,// ID của user
          type: 'PASSWORD_RESET',// Loại OTP là reset password
          isUsed: false,// OTP chưa được dùng
        },
      });

      // Lưu OTP mới
      await tx.otpVerification.create({
        data: {
          userId: user.id,// ID của user
          email: user.email,// Email của user
          otpCode,// Mã OTP
          type: 'PASSWORD_RESET',// Loại OTP là reset password
          expiresAt,// Thời gian hết hạn của OTP
        },
      });
    });

    // Gửi OTP qua email
    await sendForgotPasswordEmail({ email: user.email, otpCode });
    return safeSuccess();// Trả về thành công
  } catch (error) {
    logger.error('requestPasswordReset', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi server.',
    });
  }
};

/**
 * Bước 2: Người dùng nhập OTP để lấy reset token
 */
export const verifyPasswordResetOTP = async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const otpCode = (req.body.otpCode || '').trim();
    if (!email || !otpCode) {
      return res.status(400).json({
        success: false,
        message: 'Email và mã OTP là bắt buộc.',
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Email hoặc mã OTP không đúng.',
      });
    }

    // Tìm record OTP mới nhất của user
    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        userId: user.id,
        email: user.email,
        type: 'PASSWORD_RESET',
        isUsed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP không tồn tại hoặc đã dùng.',
      });
    }

    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã vượt quá số lần thử OTP.',
      });
    }
// OTP không đúng -> tăng số lần thử
    if (otpRecord.otpCode !== otpCode) {
      await prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      return res.status(400).json({
        success: false,
        message: 'Email hoặc mã OTP không đúng.',
      });
    }
// OTP hết hạn -> đánh dấu là đã dùng
    if (otpRecord.expiresAt < new Date()) {
      await prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { isUsed: true },
      });
      return res.status(400).json({
        success: false,
        message: 'Mã OTP đã hết hạn.',
      });
    }

    // OTP hợp lệ -> sinh token reset random 32 bytes
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TTL_HR * 60 * 60 * 1000);
// Cập nhật OTP là đã dùng
    await prisma.$transaction(async (tx) => {
      await tx.otpVerification.update({
        where: { id: otpRecord.id },// ID của OTP
        data: { isUsed: true },// OTP đã dùng
      });
// Xóa các token reset cũ chưa dùng
      await tx.passwordReset.deleteMany({
        where: { userId: user.id, isUsed: false },
      });
// Tạo token reset mới
      await tx.passwordReset.create({
        data: {
          userId: user.id,// ID của user
          token: resetToken,// Token reset
          expiresAt,// Thời gian hết hạn của token reset
        },
      });
    });

    return res.json({
      success: true,
      message: 'Xác thực OTP thành công.',
      data: { resetToken },
    });
  } catch (error) {
    logger.error('verifyPasswordResetOTP', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi server.',
    });
  }
};

/**
 * Bước 3: Người dùng cung cấp token + mật khẩu mới để reset
 */
export const resetPassword = async (req, res) => {
  try {
    const token = (req.body.resetToken || '').trim();// Token reset
    const newPassword = req.body.newPassword || '';// Mật khẩu mới
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token và mật khẩu mới là bắt buộc.',
      });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải >= 6 ký tự.',
      });
    }

    // Lấy record token tương ứng trong DB
    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token },
    });
    // Token không hợp lệ hoặc đã hết hạn
    if (!resetRecord || resetRecord.isUsed || resetRecord.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn.',
      });
    }

    // Hash mật khẩu mới trước khi lưu DB
    const hashedPassword = await bcrypt.hash(newPassword, 10);
// Cập nhật mật khẩu mới 
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashedPassword },
      });
// Cập nhật token reset là đã dùng
      await tx.passwordReset.update({
        where: { id: resetRecord.id },
        data: { isUsed: true },
      });
    });

    return res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công.',
    });
  } catch (error) {
    logger.error('resetPassword', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi server.',
    });
  }
};

