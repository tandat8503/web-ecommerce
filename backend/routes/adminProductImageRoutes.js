import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.middleware.js';
import { createProductImageSchema, updateProductImageSchema, reorderImagesSchema } from '../validators/productImage.valid.js';
import { uploadProduct } from '../middleware/uploadcloud.js';
import {
  getProductImages,
  getProductImage,
  createProductImage,
  updateProductImage,
  deleteProductImage,
  setPrimaryImage,
  reorderImages
} from '../controller/adminProductImageController.js';

const router = Router();

/**
 * ✅ API PUBLIC - Lấy danh sách ảnh của sản phẩm (không cần đăng nhập)
 * Dùng cho user xem gallery ảnh sản phẩm
 */
router.get('/public/:productId', getProductImages);

/**
 * ✅ API PUBLIC - Lấy chi tiết 1 ảnh (không cần đăng nhập)
 */
router.get('/public/image/:id', getProductImage);

// Tất cả route dưới đây đều cần auth và admin
router.use(authenticateToken, requireAdmin);

// Lấy danh sách ảnh của sản phẩm - Admin
router.get('/:productId', getProductImages);

// Lấy chi tiết 1 ảnh - Admin
router.get('/image/:id', getProductImage);

// Tạo ảnh mới cho sản phẩm
router.post('/:productId', uploadProduct.single('image'), validate(createProductImageSchema), createProductImage);

// Cập nhật ảnh (có thể upload ảnh mới)
router.put('/:id', uploadProduct.single('image'), validate(updateProductImageSchema), updateProductImage);

// Xóa ảnh
router.delete('/:id', deleteProductImage);

// Set ảnh chính
router.patch('/:productId/set-primary', setPrimaryImage);

// Sắp xếp lại thứ tự ảnh
router.patch('/:productId/reorder', validate(reorderImagesSchema), reorderImages);

export default router;
