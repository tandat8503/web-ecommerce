import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import {
  listOrders, getOrder, updateOrder, updateOrderNotes, getOrderStats
} from '../controller/adminOrderController.js';

const router = Router();

router.use(authenticateToken, requireAdmin);

router.get('/', listOrders);//lấy danh sách đơn hàng
router.get('/stats', getOrderStats);//lấy thống kê đơn hàng
router.get('/:id', getOrder);//lấy chi tiết đơn hàng
router.put('/:id', updateOrder);//cập nhật trạng thái đơn hàng
router.put('/:id/notes', updateOrderNotes);//cập nhật ghi chú đơn hàng

export default router;