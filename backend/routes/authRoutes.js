// routes/authRoutes.js
import express from "express";
import { 
  login, 
  register, 
  logout, 
  googleLogin
} from "../controller/authController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Public routes - không cần authentication
router.post("/login", login);
router.post("/register", register);
router.post("/google", googleLogin); // Google Login

// Protected routes - cần authentication
router.post("/logout", authenticateToken, logout);

// LƯU Ý: Profile đã chuyển sang /api/user/profile
// Sử dụng userController.getUserProfile() thay vì getProfile()

export default router;
