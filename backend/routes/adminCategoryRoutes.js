import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.middleware.js';
import { createCategorySchema, updateCategorySchema } from '../validators/category.valid.js';
import {
  listCategories, getCategory, createCategory, updateCategory, deleteCategory
} from '../controller/adminCategoryController.js';
import { uploadCategory} from "../middleware/uploadcloud.js";


const router = Router();
/**
 * ✅ Cho phép user frontend lấy danh mục (public)
 *    Không cần token, không cần admin
 */
router.get("/public", listCategories);


// Tất cả route trong này đều cần auth và admin
router.use(authenticateToken, requireAdmin);

router.get('/', listCategories);
router.get('/:id', getCategory);
router.post('/', uploadCategory.single("image"), validate(createCategorySchema), createCategory);
router.put('/:id', uploadCategory.single("image"), updateCategory);
router.delete('/:id', deleteCategory);

export default router;
