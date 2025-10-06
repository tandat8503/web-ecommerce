import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.middleware.js';
import { createProductSchema, updateProductSchema } from '../validators/product.valid.js';
import {
  listProducts, getProduct, createProduct, updateProduct, deleteProduct, updateProductPrimaryImage
} from '../controller/adminProductController.js';
import { uploadProduct } from '../middleware/uploadcloud.js';

const router = Router();
router.use(authenticateToken, requireAdmin);

router.get('/', listProducts);
router.get('/:id', getProduct);
router.post('/', uploadProduct.single('image'), validate(createProductSchema), createProduct);
router.put('/:id', uploadProduct.single('image'), validate(updateProductSchema), updateProduct);
router.delete('/:id', deleteProduct);
router.patch('/:id/primary-image', updateProductPrimaryImage);

export default router;