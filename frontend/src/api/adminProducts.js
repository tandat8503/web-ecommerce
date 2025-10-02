import axiosClient from './axiosClient';

const adminProductsAPI = {
  // Lấy danh sách products với pagination và search
  getProducts: (params = {}) => {
    return axiosClient.get('/admin/products', { params });
  },

  // Lấy product theo ID
  getProduct: (id) => {
    return axiosClient.get(`/admin/products/${id}`);
  },

  // Tạo product mới
  createProduct: (data) => {
    return axiosClient.post('/admin/products', data);
  },

  // Cập nhật product
  updateProduct: (id, data) => {
    return axiosClient.put(`/admin/products/${id}`, data);
  },

  // Xóa product
  deleteProduct: (id) => {
    return axiosClient.delete(`/admin/products/${id}`);
  },
};

export default adminProductsAPI;
