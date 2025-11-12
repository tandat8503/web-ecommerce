import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  createOrder,
  getUserOrders,
  getOrderById,
  confirmReceivedOrder,
  cancelOrder
} from "../controller/orderController.js";
import { createOrderSchema } from "../validators/order.valid.js";
import { validate } from "../middleware/validate.middleware.js";

const router = express.Router();

// Tất cả API đặt hàng cho USER yêu cầu đăng nhập
router.use(authenticateToken);

// Tạo đơn hàng từ giỏ hàng
router.post("/", validate(createOrderSchema), createOrder);

// Danh sách đơn hàng (phân trang, lọc trạng thái)
router.get("/", getUserOrders);

// Chi tiết đơn hàng theo ID (chỉ của chính user)
router.get("/:id", getOrderById);

// Hủy đơn (chỉ khi PENDING)
router.put("/:id/cancel", cancelOrder);

// Xác nhận đã nhận hàng (PROCESSING → DELIVERED)
router.put("/:id/confirm-received", confirmReceivedOrder);

export default router;


