import express from 'express';
import { generateQRCode, handleWebhook, getBanks } from '../controller/tingeeController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();



// Tạo QR code (Protected - User must be logged in)
router.post('/generate-qr', authenticateToken, generateQRCode);

// Xử lý webhook (Public - Called by Tingee)
router.post('/webhook', handleWebhook);

// Lấy danh sách ngân hàng được hỗ trợ (Public)
router.get('/banks', getBanks);

export default router;
