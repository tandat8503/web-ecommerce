import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.middleware.js';
import { createBrandSchema, updateBrandSchema } from '../validators/brand.valid.js';
import {
  listBrands, getBrand, createBrand, updateBrand, deleteBrand
} from '../controller/adminBrandController.js';

const router = Router();

/**
 * ✅ API PUBLIC - Cho phép user frontend lấy danh sách brands (không cần đăng nhập)
 */
router.get('/public', listBrands);

// Tất cả route dưới đây đều cần auth và admin
router.use(authenticateToken, requireAdmin);

router.get('/', listBrands);
router.get('/:id', getBrand);
router.post('/', validate(createBrandSchema), createBrand);
router.put('/:id', validate(updateBrandSchema), updateBrand);
router.delete('/:id', deleteBrand);

export default router;
