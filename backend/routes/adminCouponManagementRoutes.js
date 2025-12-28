// routes/adminCouponManagementRoutes.js
import express from 'express';
import {
    getAllCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    getCouponById,
    getCouponStats
} from '../controller/adminCouponManagementController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Tất cả routes đều yêu cầu admin
router.use(authenticateToken, requireAdmin);

// GET /api/admin/coupon-management - Lấy danh sách mã giảm giá
router.get('/', getAllCoupons);

// GET /api/admin/coupon-management/stats - Thống kê
router.get('/stats', getCouponStats);

// GET /api/admin/coupon-management/:id - Chi tiết mã giảm giá
router.get('/:id', getCouponById);

// POST /api/admin/coupon-management - Tạo mã giảm giá mới
router.post('/', createCoupon);

// PUT /api/admin/coupon-management/:id - Cập nhật mã giảm giá
router.put('/:id', updateCoupon);

// DELETE /api/admin/coupon-management/:id - Xóa mã giảm giá
router.delete('/:id', deleteCoupon);

export default router;
