import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  calculateShipping,
  validateCoupon
} from "../controller/orderController.js";
import { 
  createOrderSchema
} from "../validators/order.valid.js";
import { validate } from "../middleware/validate.middleware.js";

const router = express.Router();

// Tất cả routes đều yêu cầu authentication
router.use(authenticateToken);

// Tính phí vận chuyển trước khi đặt hàng
router.post("/calculate-shipping", calculateShipping);

// Kiểm tra mã giảm giá trước khi đặt hàng
router.post("/validate-coupon", validateCoupon);

// Tạo đơn hàng mới
router.post("/", validate(createOrderSchema), createOrder);

// Lấy danh sách đơn hàng của user
router.get("/", getUserOrders);

// Lấy chi tiết đơn hàng theo ID
router.get("/:id", getOrderById);

// Hủy đơn hàng (chỉ được hủy khi status = PENDING)
router.put("/:id/cancel", cancelOrder);

export default router;
