import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import {
  listOrders, getOrder, updateOrder, cancelOrder, updateOrderNotes, getOrderStats, getRevenueByCategory, getTopProducts
} from '../controller/adminOrderController.js';

const router = Router();

router.use(authenticateToken, requireAdmin);

router.get('/', listOrders); // Lấy danh sách đơn hàng
router.get('/stats', getOrderStats); // Lấy thống kê đơn hàng
router.get('/revenue-by-category', getRevenueByCategory); // Lấy doanh thu theo danh mục (cho Rose Chart)
router.get('/top-products', getTopProducts); // Lấy top sản phẩm bán chạy nhất
router.get('/:id', getOrder); // Lấy chi tiết đơn hàng
router.put('/:id', updateOrder); // Cập nhật trạng thái đơn hàng
router.put('/:id/cancel', cancelOrder); // Hủy đơn hàng
router.put('/:id/notes', updateOrderNotes); // Cập nhật ghi chú đơn hàng

export default router;