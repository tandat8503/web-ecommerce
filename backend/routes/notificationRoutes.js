import express from "express";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from "../controller/notificationController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Tất cả routes đều yêu cầu authentication
router.use(authenticateToken);

// Lấy danh sách thông báo
router.get("/", getNotifications);

// Đếm số lượng chưa đọc
router.get("/unread-count", getUnreadCount);

// Đánh dấu đã đọc
router.put("/:id/read", markAsRead);

// Đánh dấu tất cả đã đọc
router.put("/read-all", markAllAsRead);

// Xóa thông báo
router.delete("/:id", deleteNotification);

export default router;

