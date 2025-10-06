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
router.use(authenticateToken, requireAdmin);

// Lấy danh sách ảnh của sản phẩm
router.get('/:productId', getProductImages);

// Lấy chi tiết 1 ảnh
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
