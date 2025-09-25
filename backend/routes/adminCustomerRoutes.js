import express from "express";
import {
  getCustomers,
  getCustomerById,
  updateCustomerStatus,
  getCustomerOrders,
} from "../controller/adminCustomerController.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// Áp dụng middleware xác thực + quyền admin
router.use(authenticateToken, requireAdmin);

// Danh sách khách hàng
router.get("/", getCustomers);

// Chi tiết khách hàng
router.get("/:id", getCustomerById);

// Kích hoạt / vô hiệu hóa khách hàng
router.put("/:id/status", updateCustomerStatus);

// Lấy đơn hàng của khách hàng
router.get("/:id/orders", getCustomerOrders);

export default router;
