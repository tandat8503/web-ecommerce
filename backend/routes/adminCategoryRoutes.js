import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.middleware.js';
import { createCategorySchema, updateCategorySchema } from '../validators/category.valid.js';
import {
  listCategories, getCategory, createCategory, updateCategory, deleteCategory
} from '../controller/adminCategoryController.js';

const router = Router();
router.use(authenticateToken, requireAdmin);

router.get('/', listCategories);
router.get('/:id', getCategory);
router.post('/', validate(createCategorySchema), createCategory);
router.put('/:id', validate(updateCategorySchema), updateCategory);
router.delete('/:id', deleteCategory);

export default router;
