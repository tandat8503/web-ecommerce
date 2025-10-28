import express from "express";
import {
  createProductVariant,
  getProductVariants,
  getProductVariantById,
  updateProductVariant,
  deleteProductVariant,
} from "../controller/adminProductVariantController.js";
import { authenticateToken, requireAdmin } from '../middleware/auth.js';


const router = express.Router();

/**
 * ✅ API PUBLIC - Lấy danh sách biến thể theo productId (không cần đăng nhập)
 * Dùng cho user xem các biến thể của sản phẩm (màu, size...)
 */
router.get("/public", getProductVariants);

/**
 * ✅ API PUBLIC - Lấy chi tiết biến thể theo ID (không cần đăng nhập)
 * Dùng cho user xem chi tiết 1 biến thể (màu, size, giá, tồn kho...)
 */
router.get("/public/:id", getProductVariantById);

// Tất cả route dưới đây đều cần auth và admin
router.use(authenticateToken, requireAdmin);

// Tạo biến thể mới
router.post("/", createProductVariant);

// Lấy danh sách biến thể (có thể lọc theo productId) - Admin
router.get("/", getProductVariants);

// Lấy chi tiết 1 biến thể
router.get("/:id", getProductVariantById);

// Cập nhật biến thể
router.put("/:id", updateProductVariant);

// Xóa biến thể
router.delete("/:id", deleteProductVariant);

export default router;
