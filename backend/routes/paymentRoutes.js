import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  createMoMoPayment,
  handleMoMoCallback,
  getPaymentStatus
} from '../controller/paymentController.js';

const router = express.Router();


/**
 * ============================================
 * PAYMENT ROUTES
 * ============================================
 * Định nghĩa các đường dẫn API cho thanh toán MoMo
 */

// ============================================
// TẠO PAYMENT URL CHO MOMO
// ============================================
// POST /api/payment/momo/create
// Yêu cầu: Phải đăng nhập (authenticateToken)
// Chức năng: Tạo payment URL từ MoMo để user thanh toán
router.post('/momo/create', authenticateToken, createMoMoPayment);

// ============================================
// CALLBACK TỪ MOMO (IPN)
// ============================================
// POST /api/payment/momo/callback
// Yêu cầu: KHÔNG cần đăng nhập (MoMo sẽ gọi trực tiếp)
// Chức năng: Nhận callback từ MoMo sau khi user thanh toán xong
router.post('/momo/callback', handleMoMoCallback);

// ============================================
// KIỂM TRA TRẠNG THÁI THANH TOÁN
// ============================================
// GET /api/payment/status/:orderId
// Yêu cầu: Phải đăng nhập (authenticateToken)
// Chức năng: Kiểm tra trạng thái thanh toán của đơn hàng
router.get('/status/:orderId', authenticateToken, getPaymentStatus);

export default router;
