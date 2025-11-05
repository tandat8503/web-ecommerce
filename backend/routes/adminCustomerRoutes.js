import express from "express";
import {
  createCustomer,
  getCustomers,
  updateCustomer,
  deleteCustomer,
} from "../controller/adminCustomerController.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// Áp dụng middleware xác thực + quyền admin
router.use(authenticateToken, requireAdmin);

// CRUD - 4 API cho quản lý người dùng & admin
router.post("/", createCustomer);        // 1. CREATE - Tạo mới
router.get("/", getCustomers);           // 2. READ - Danh sách
router.get("/:id", getCustomers);        // 2. READ - Chi tiết
router.put("/:id", updateCustomer);      // 3. UPDATE - Cập nhật
router.delete("/:id", deleteCustomer);   // 4. DELETE - Xóa

export default router;
