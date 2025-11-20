import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.middleware.js';
import { 
  reviewSchema, 
  updateReviewSchema,
  approveReviewSchema 
} from '../validators/productReview.valid.js';
import {
  // User routes
  createReview,
  getMyReviews,
  updateMyReview,
  deleteMyReview,
  // Public routes
  getProductReviews,
  // Admin routes
  adminGetAllReviews,
  adminApproveReview,
  adminDeleteReview,
  adminGetReviewStats
} from '../controller/productReviewController.js';

const router = express.Router();

// ===========================
// PUBLIC ROUTES (Không cần token)
// ===========================
// Lấy danh sách đánh giá của sản phẩm (chỉ approved)
router.get('/product/:productId', getProductReviews);

// ===========================
// USER ROUTES (Cần token)
// ===========================
// Tạo đánh giá mới (⭐ Yêu cầu: order DELIVERED)
router.post('/', authenticateToken, validate(reviewSchema), createReview);

// Lấy danh sách đánh giá của chính mình
router.get('/my-reviews', authenticateToken, getMyReviews);

// Cập nhật đánh giá của mình
router.put('/:id', authenticateToken, validate(updateReviewSchema), updateMyReview);

// Xóa đánh giá của mình
router.delete('/:id', authenticateToken, deleteMyReview);

// ===========================
// ADMIN ROUTES (Cần token + role ADMIN)
// ===========================
// Lấy thống kê đánh giá
router.get('/admin/stats', authenticateToken, requireAdmin, adminGetReviewStats);

// Lấy tất cả đánh giá (có filter)
router.get('/admin/all', authenticateToken, requireAdmin, adminGetAllReviews);

// Approve/Reject đánh giá
router.patch('/admin/:id/approve', authenticateToken, requireAdmin, validate(approveReviewSchema), adminApproveReview);

// Xóa đánh giá (admin)
router.delete('/admin/:id', authenticateToken, requireAdmin, adminDeleteReview);

export default router;

