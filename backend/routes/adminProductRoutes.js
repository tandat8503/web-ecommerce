import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.middleware.js';
import { createProductSchema, updateProductSchema } from '../validators/product.valid.js';
import {
  listProducts, getProduct, createProduct, updateProduct, deleteProduct
} from '../controller/adminProductController.js';

const router = Router();
router.use(authenticateToken, requireAdmin);

router.get('/', listProducts);
router.get('/:id', getProduct);
router.post('/', validate(createProductSchema), createProduct);
router.put('/:id', validate(updateProductSchema), updateProduct);
router.delete('/:id', deleteProduct);

export default router;
