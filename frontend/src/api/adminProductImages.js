import axiosClient from './axiosClient';

/**
 * Lấy danh sách ảnh của sản phẩm - ADMIN
 * Yêu cầu: Token admin
 * @param {number|string} productId - ID của sản phẩm
 * @returns {Promise} Response chứa danh sách hình ảnh
 */
export async function getProductImages(productId) {
  return await axiosClient.get(`admin/product-images/${productId}`);
}

/**
 * Lấy danh sách ảnh của sản phẩm (PUBLIC - không cần token)
 * API này dùng cho trang user (ProductDetail), không yêu cầu đăng nhập
 * Cả user và admin đều có thể sử dụng API này
 * @param {number|string} productId - ID của sản phẩm
 * @returns {Promise} Response chứa danh sách hình ảnh của sản phẩm
 */
export async function getPublicProductImages(productId) {
  return await axiosClient.get(`product-images/public/${productId}`);
}

/**
 * Lấy chi tiết 1 ảnh - ADMIN
 * Yêu cầu: Token admin
 * @param {number|string} imageId - ID của hình ảnh
 * @returns {Promise} Response chứa thông tin chi tiết hình ảnh
 */
export async function getProductImage(imageId) {
  return await axiosClient.get(`admin/product-images/image/${imageId}`);
}

/**
 * Lấy chi tiết 1 ảnh (PUBLIC - không cần token)
 * API này dùng cho trang user (ProductDetail), không yêu cầu đăng nhập
 * Cả user và admin đều có thể sử dụng API này
 * @param {number|string} imageId - ID của hình ảnh
 * @returns {Promise} Response chứa thông tin chi tiết hình ảnh
 */
export async function getPublicProductImage(imageId) {
  return await axiosClient.get(`product-images/public/image/${imageId}`);
}

/**
 * Thêm ảnh mới cho sản phẩm
 */
export async function createProductImage(productId, data) {
  return await axiosClient.post(`admin/product-images/${productId}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

/**
 * Cập nhật ảnh sản phẩm
 */
export async function updateProductImage(imageId, data) {
  return await axiosClient.put(`admin/product-images/${imageId}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

/**
 * Xóa ảnh sản phẩm
 */
export async function deleteProductImage(imageId) {
  return await axiosClient.delete(`admin/product-images/${imageId}`);
}

/**
 * Set ảnh chính
 */
export async function setPrimaryImage(productId, imageId) {
  return await axiosClient.patch(`admin/product-images/${productId}/set-primary`, { imageId });
}

/**
 * Sắp xếp lại thứ tự ảnh
 */
export async function reorderImages(productId, imageOrders) {
  return await axiosClient.patch(`admin/product-images/${productId}/reorder`, { imageOrders });
}

/**
 * Cập nhật ảnh chính của product
 */
export async function updateProductPrimaryImage(productId, data) {
  return await axiosClient.patch(`admin/products/${productId}/primary-image`, data);
}

// Default export object chứa tất cả functions
const adminProductImagesAPI = {
  getProductImages, // Lấy danh sách ảnh (admin - cần token)
  getPublicProductImages, // Lấy danh sách ảnh (public - không cần token)
  getProductImage, // Lấy chi tiết ảnh (admin - cần token)
  getPublicProductImage, // Lấy chi tiết ảnh (public - không cần token)
  createProductImage, // Tạo ảnh mới
  updateProductImage, // Cập nhật ảnh
  deleteProductImage, // Xóa ảnh
  setPrimaryImage, // Set ảnh chính
  reorderImages, // Sắp xếp lại thứ tự ảnh
  updateProductPrimaryImage // Cập nhật ảnh chính của product
};

export default adminProductImagesAPI;
