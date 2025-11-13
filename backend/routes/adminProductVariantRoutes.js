// Import các thư viện cần thiết
import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createProductVariantSchema,
  updateProductVariantSchema
} from '../validators/productVariant.valid.js';
import {
  getProductVariants,
  getProductVariantById,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  getPublicProductVariants,
  getPublicProductVariantById
} from '../controller/adminProductVariantController.js';

const router = Router();

// ==================== PUBLIC ROUTES ====================
// Không cần authentication, dành cho user xem sản phẩm

/**
 * Lấy danh sách variants PUBLIC (chỉ lấy isActive = true)
 * GET /api/product-variants/public?productId=1
 */
router.get('/public', getPublicProductVariants);

/**
 * Lấy chi tiết 1 variant PUBLIC (chỉ lấy isActive = true)
 * GET /api/product-variants/public/:id
 */
router.get('/public/:id', getPublicProductVariantById);

// ==================== ADMIN ROUTES ====================
// Tất cả routes dưới đây cần authentication và quyền admin
router.use(authenticateToken, requireAdmin);

/**
 * Lấy danh sách tất cả variants (có thể filter theo productId)
 * GET /api/admin/product-variants?productId=1&page=1&limit=10
 */
router.get('/', getProductVariants);

/**
 * Lấy chi tiết 1 variant
 * GET /api/admin/product-variants/:id
 */
router.get('/:id', getProductVariantById);

/**
 * Tạo variant mới
 * POST /api/admin/product-variants
 * Body: { productId, stockQuantity, width, depth, height, ... }
 */
router.post('/', validate(createProductVariantSchema), createProductVariant);

/**
 * Cập nhật variant
 * PUT /api/admin/product-variants/:id
 * Body: { stockQuantity, width, ... }
 */
router.put('/:id', validate(updateProductVariantSchema), updateProductVariant);

/**
 * Xóa variant
 * DELETE /api/admin/product-variants/:id
 */
router.delete('/:id', deleteProductVariant);

export default router;

