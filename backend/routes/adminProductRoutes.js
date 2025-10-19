// Import các thư viện cần thiết
import { Router } from 'express'; // Express Router để tạo routes
import { authenticateToken, requireAdmin } from '../middleware/auth.js'; // Middleware xác thực và phân quyền
import { validate } from '../middleware/validate.middleware.js'; // Middleware validate dữ liệu đầu vào
import { createProductSchema, updateProductSchema } from '../validators/product.valid.js'; // Schema validation cho sản phẩm
import {
  listProducts, getProduct, createProduct, updateProduct, deleteProduct, updateProductPrimaryImage, getProductsByCategory
} from '../controller/adminProductController.js'; // Import các controller functions
import { uploadProduct } from '../middleware/uploadcloud.js'; // Middleware upload ảnh lên Cloudinary

// Tạo router instance
const router = Router();

// Route lấy sản phẩm theo category (API mới được thêm)
router.get('/category/:categoryId', getProductsByCategory);

// Áp dụng middleware authentication và authorization cho tất cả routes
// Chỉ admin mới có thể truy cập các API quản lý sản phẩm
router.use(authenticateToken, requireAdmin);

// ==================== PRODUCT ROUTES ====================

// Route lấy danh sách sản phẩm với phân trang và tìm kiếm
router.get('/', listProducts);



// Route lấy chi tiết một sản phẩm theo ID
router.get('/:id', getProduct);

// Route tạo sản phẩm mới với upload ảnh
// uploadProduct.single('image') - Middleware xử lý upload ảnh (field name: 'image')
// validate(createProductSchema) - Middleware validate dữ liệu đầu vào
router.post('/', uploadProduct.single('image'), validate(createProductSchema), createProduct);

// Route cập nhật sản phẩm với upload ảnh (optional)
// uploadProduct.single('image') - Middleware xử lý upload ảnh (optional)
// validate(updateProductSchema) - Middleware validate dữ liệu đầu vào
router.put('/:id', uploadProduct.single('image'), validate(updateProductSchema), updateProduct);

// Route xóa sản phẩm
router.delete('/:id', deleteProduct);

// Route cập nhật ảnh chính của sản phẩm
router.patch('/:id/primary-image', updateProductPrimaryImage);

export default router;