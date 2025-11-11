import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.middleware.js';
import { 
  commentSchema, 
  updateCommentSchema,
  approveCommentSchema 
} from '../validators/productComment.valid.js';
import {
  // User routes
  createComment,
  getMyComments,
  updateMyComment,
  deleteMyComment,
  // Public routes
  getProductComments,
  // Admin routes
  adminGetAllComments,
  adminApproveComment,
  adminDeleteComment,
  adminGetCommentStats
} from '../controller/productCommentController.js';

const router = express.Router();

// ===========================
// PUBLIC ROUTES (Không cần token)
// ===========================
// Lấy danh sách bình luận của sản phẩm (chỉ approved)
router.get('/product/:productId', getProductComments);

// ===========================
// USER ROUTES (Cần token)
// ===========================
// Tạo bình luận mới
router.post('/', authenticateToken, validate(commentSchema), createComment);

// Lấy danh sách bình luận của chính mình
router.get('/my-comments', authenticateToken, getMyComments);

// Cập nhật bình luận của mình (chỉ khi chưa approve)
router.put('/:id', authenticateToken, validate(updateCommentSchema), updateMyComment);

// Xóa bình luận của mình (chỉ khi chưa approve)
router.delete('/:id', authenticateToken, deleteMyComment);

// ===========================
// ADMIN ROUTES (Cần token + role ADMIN)
// ===========================
// Lấy thống kê bình luận
router.get('/admin/stats', authenticateToken, requireAdmin, adminGetCommentStats);

// Lấy tất cả bình luận (có filter)
router.get('/admin/all', authenticateToken, requireAdmin, adminGetAllComments);

// Approve/Reject bình luận
router.patch('/admin/:id/approve', authenticateToken, requireAdmin, validate(approveCommentSchema), adminApproveComment);

// Xóa bình luận (admin)
router.delete('/admin/:id', authenticateToken, requireAdmin, adminDeleteComment);

export default router;

