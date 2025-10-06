import axiosClient from './axiosClient';

/**
 * Lấy danh sách ảnh của sản phẩm
 */
export async function getProductImages(productId) {
  return await axiosClient.get(`admin/product-images/${productId}`);
}

/**
 * Lấy chi tiết 1 ảnh
 */
export async function getProductImage(imageId) {
  return await axiosClient.get(`admin/product-images/image/${imageId}`);
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
  getProductImages,
  getProductImage,
  createProductImage,
  updateProductImage,
  deleteProductImage,
  setPrimaryImage,
  reorderImages,
  updateProductPrimaryImage
};

export default adminProductImagesAPI;
