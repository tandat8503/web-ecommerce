import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getPaymentStatus,
  createVNPayPayment,
  handleVNPayCallback,
  handleVNPayReturn
} from '../controller/paymentController.js';

const router = express.Router();


router.get('/status/:orderId', authenticateToken, getPaymentStatus);


router.post('/vnpay/create', authenticateToken, createVNPayPayment);

// VNPay có thể gọi IPN bằng GET hoặc POST, nên cho phép cả hai
router.get('/vnpay/callback', handleVNPayCallback);
router.post('/vnpay/callback', handleVNPayCallback);

// URL return mà vnp_ReturnUrl sẽ redirect về sau khi khách thanh toán xong
router.get('/vnpay/return', handleVNPayReturn);

export default router;