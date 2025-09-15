import express from "express";
import { authenticateToken } from "../middleware/auth.js"; 
import { getUserProfile,changePassword,updateUserProfile,getLoginHistory} from "../controller/userController.js";
import { uploadAvatar } from "../middleware/uploadcloud.js";


const router = express.Router();

// Cho user cá nhân
router.get("/profile", authenticateToken, getUserProfile);
router.put("/profile/change-password", authenticateToken, changePassword);//đổi password
router.put("/profile", authenticateToken, uploadAvatar.single("image"), updateUserProfile);//cập nhật profile


// Lịch sử đăng nhập
router.get("/login-history", authenticateToken, getLoginHistory);
export default router;
