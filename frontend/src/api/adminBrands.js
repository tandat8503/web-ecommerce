import axiosClient from './axiosClient';

/**
 * Lấy danh sách brands (admin)
 */
export async function getBrands(params) {
  return await axiosClient.get('admin/brands', { params });
}

/**
 * Lấy chi tiết 1 brand (admin)
 */
export async function getBrandById(id) {
  return await axiosClient.get(`admin/brands/${id}`);
}

/**
 * Thêm mới brand (admin)
 */
export async function createBrand(data) {
  return await axiosClient.post('admin/brands', data);
}

/**
 * Cập nhật brand (admin)
 */
export async function updateBrand(id, data) {
  return await axiosClient.put(`admin/brands/${id}`, data);
}

/**
 * Xóa brand (admin)
 */
export async function deleteBrand(id) {
  return await axiosClient.delete(`admin/brands/${id}`);
}

// Default export object chứa tất cả functions (để tương thích với AdminProducts, Dashboard)
const adminBrandsAPI = {
  getBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand
};

export default adminBrandsAPI;
