import axiosClient from './axiosClient';

// ===== PUBLIC API =====
export const getProductComments = (productId, params = {}) => {
  return axiosClient.get(`/product-comments/product/${productId}`, { params });
};

// ===== USER API (cần AUTH) =====
export const createComment = (data) => {
  return axiosClient.post('/product-comments', data);
};

export const getMyComments = (params = {}) => {
  return axiosClient.get('/product-comments/my-comments', { params });
};

export const updateMyComment = (id, data) => {
  return axiosClient.put(`/product-comments/${id}`, data);
};

export const deleteMyComment = (id) => {
  return axiosClient.delete(`/product-comments/${id}`);
};

// ===== ADMIN API =====
export const adminGetAllComments = (params = {}) => {
  return axiosClient.get('/product-comments/admin/all', { params });
};

export const adminApproveComment = (id, isApproved) => {
  return axiosClient.patch(`/product-comments/admin/${id}/approve`, { isApproved });
};

export const adminDeleteComment = (id) => {
  return axiosClient.delete(`/product-comments/admin/${id}`);
};

export const adminGetCommentStats = () => {
  return axiosClient.get('/product-comments/admin/stats');
};
