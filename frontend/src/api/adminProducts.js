import axiosClient from './axiosClient';

/**
 * Lấy danh sách products (admin)
 */
export async function getProducts(params) {
  return await axiosClient.get('admin/products', { params });
}

/**
 * Lấy chi tiết 1 product (admin)
 */
export async function getProductById(id) {
  return await axiosClient.get(`admin/products/${id}`);
}

/**
 * Thêm mới product (admin)
 */
export async function createProduct(data) {
  return await axiosClient.post('admin/products', data);
}

/**
 * Cập nhật product (admin)
 */
export async function updateProduct(id, data) {
  return await axiosClient.put(`admin/products/${id}`, data);
}

/**
 * Xóa product (admin)
 */
export async function deleteProduct(id) {
  return await axiosClient.delete(`admin/products/${id}`);
}

// Default export object chứa tất cả functions (để tương thích với Dashboard)
const adminProductsAPI = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};

export default adminProductsAPI;
