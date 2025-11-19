// routes/authRoutes.js
import express from "express";
import { 
  login, 
  register, 
  logout, 
  googleLogin
} from "../controller/authController.js";
import {
  requestPasswordReset,
  verifyPasswordResetOTP,
  resetPassword
} from "../controller/passwordController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Public routes - không cần authentication
router.post("/login", login);
router.post("/register", register);
router.post("/google", googleLogin); // Google Login
// Password reset routes - không cần authentication
router.post("/forgot-password", requestPasswordReset);// Forgot Password
router.post("/verify-otp", verifyPasswordResetOTP);// Verify OTP
router.post("/reset-password", resetPassword);// Reset Password

// Protected routes - cần authentication
router.post("/logout", authenticateToken, logout);

// LƯU Ý: Profile đã chuyển sang /api/user/profile
// Sử dụng userController.getUserProfile() thay vì getProfile()

export default router;
