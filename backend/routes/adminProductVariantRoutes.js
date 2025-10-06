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
router.use(authenticateToken, requireAdmin);

// Tạo biến thể mới
router.post("/", createProductVariant);

// Lấy danh sách biến thể (có thể lọc theo productId)
router.get("/", getProductVariants);

// Lấy chi tiết 1 biến thể
router.get("/:id", getProductVariantById);

// Cập nhật biến thể
router.put("/:id", updateProductVariant);

// Xóa biến thể
router.delete("/:id", deleteProductVariant);

export default router;
