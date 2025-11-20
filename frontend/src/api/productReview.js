import axiosClient from './axiosClient';

// ===== PUBLIC API =====
/**
 * Lấy danh sách đánh giá của sản phẩm (public)
 * @param {number} productId - ID sản phẩm
 * @param {object} params - Query params: page, limit, rating
 */
export const getProductReviews = (productId, params = {}) => {
  return axiosClient.get(`/product-reviews/product/${productId}`, { params });
};

// ===== USER API (cần AUTH) =====
/**
 * Tạo đánh giá mới
 * ⭐ Yêu cầu: User phải có order DELIVERED chứa sản phẩm này
 * @param {object} data - { productId, rating, title?, comment?, orderId? }
 */
export const createReview = (data) => {
  return axiosClient.post('/product-reviews', data);
};

/**
 * Lấy danh sách đánh giá của chính mình
 * @param {object} params - Query params: page, limit, productId
 */
export const getMyReviews = (params = {}) => {
  return axiosClient.get('/product-reviews/my-reviews', { params });
};

/**
 * Cập nhật đánh giá của mình
 * @param {number} id - ID đánh giá
 * @param {object} data - { rating?, title?, comment? }
 */
export const updateMyReview = (id, data) => {
  return axiosClient.put(`/product-reviews/${id}`, data);
};

/**
 * Xóa đánh giá của mình
 * @param {number} id - ID đánh giá
 */
export const deleteMyReview = (id) => {
  return axiosClient.delete(`/product-reviews/${id}`);
};

// ===== ADMIN API =====
/**
 * Lấy tất cả đánh giá (admin)
 * @param {object} params - Query params: page, limit, productId, isApproved, rating, q
 */
export const adminGetAllReviews = (params = {}) => {
  return axiosClient.get('/product-reviews/admin/all', { params });
};

/**
 * Approve/Reject đánh giá (admin)
 * @param {number} id - ID đánh giá
 * @param {boolean} isApproved - Trạng thái duyệt
 */
export const adminApproveReview = (id, isApproved) => {
  return axiosClient.patch(`/product-reviews/admin/${id}/approve`, { isApproved });
};

/**
 * Xóa đánh giá (admin)
 * @param {number} id - ID đánh giá
 */
export const adminDeleteReview = (id) => {
  return axiosClient.delete(`/product-reviews/admin/${id}`);
};

/**
 * Lấy thống kê đánh giá (admin)
 */
export const adminGetReviewStats = () => {
  return axiosClient.get('/product-reviews/admin/stats');
};

