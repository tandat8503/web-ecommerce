import express from "express";
import {
  getOrders,
  getOrderById,
  updateOrderStatus,
  updateOrderNotes
} from "../controller/adminOrderController.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";


const router = express.Router();

// Áp dụng middleware xác thực + quyền admin
router.use(authenticateToken, requireAdmin);

// Danh sách đơn hàng
router.get("/", getOrders);

// Chi tiết đơn hàng
router.get("/:id", getOrderById);

// Cập nhật trạng thái đơn hàng
router.put("/:id/status", updateOrderStatus);

// Cập nhật ghi chú
router.put("/:id/notes", updateOrderNotes);

export default router;
