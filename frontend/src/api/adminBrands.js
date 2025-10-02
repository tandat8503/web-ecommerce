import axiosClient from './axiosClient';

const adminBrandsAPI = {
  // Lấy danh sách brands với pagination và search
  getBrands: (params = {}) => {
    return axiosClient.get('/admin/brands', { params });
  },

  // Lấy brand theo ID
  getBrand: (id) => {
    return axiosClient.get(`/admin/brands/${id}`);
  },

  // Tạo brand mới
  createBrand: (data) => {
    return axiosClient.post('/admin/brands', data);
  },

  // Cập nhật brand
  updateBrand: (id, data) => {
    return axiosClient.put(`/admin/brands/${id}`, data);
  },

  // Xóa brand
  deleteBrand: (id) => {
    return axiosClient.delete(`/admin/brands/${id}`);
  },
};

export default adminBrandsAPI;
