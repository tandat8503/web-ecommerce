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

router.post('/vnpay/callback', handleVNPayCallback);
router.get('/vnpay/return', handleVNPayReturn);

export default router;