// Import các thư viện cần thiết
import { Router } from 'express'; // Express Router để tạo routes
import { authenticateToken, requireAdmin } from '../middleware/auth.js'; // Middleware xác thực và phân quyền
import {
  getOrders, getOrderById, updateOrderStatus, getOrderStats
} from '../controller/adminOrderController.js'; // Import các controller functions

// Tạo router instance
const router = Router();

// Áp dụng middleware authentication và authorization cho tất cả routes
// Chỉ admin mới có thể truy cập các API quản lý đơn hàng
router.use(authenticateToken, requireAdmin);

// ==================== ADMIN ORDER ROUTES ====================

// Route lấy danh sách đơn hàng với phân trang và tìm kiếm (admin)
// GET /api/admin/orders?page=1&limit=10&status=PENDING&paymentStatus=PAID&q=search&userId=123
router.get('/', getOrders);

// Route lấy thống kê đơn hàng (admin)
// GET /api/admin/orders/stats?period=30d
router.get('/stats', getOrderStats);

// Route lấy chi tiết một đơn hàng theo ID (admin)
// GET /api/admin/orders/:id
router.get('/:id', getOrderById);

// Route cập nhật trạng thái đơn hàng (admin)
// PUT /api/admin/orders/:id/status
// Body: { status: 'CONFIRMED', paymentStatus: 'PAID', notes: 'Admin notes' }
router.put('/:id/status', updateOrderStatus);

export default router;