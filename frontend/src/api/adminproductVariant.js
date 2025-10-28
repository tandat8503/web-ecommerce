import axiosClient from "./axiosClient";

/**
 * Lấy danh sách biến thể (có thể truyền productId để lọc) - ADMIN
 * Yêu cầu: Token admin
 * @param {Object} params - Tham số query: productId, page, limit
 * @returns {Promise} Response chứa danh sách biến thể
 */
export async function getProductVariants(params) {
  return await axiosClient.get("admin/product-variants", { params });
}

/**
 * Lấy danh sách biến thể của sản phẩm (PUBLIC - không cần token)
 * API này dùng cho trang user (ProductDetail), không yêu cầu đăng nhập
 * Cả user và admin đều có thể sử dụng API này
 * 
 * Backend tự động filter: chỉ lấy variants có isActive = true cho public
 * Admin sẽ xem được tất cả variants (kể cả isActive = false)
 * 
 * @param {Object} params - Tham số query: productId, page, limit
 * @returns {Promise} Response chứa danh sách biến thể của sản phẩm
 */
export async function getPublicProductVariants(params) {
  return await axiosClient.get("product-variants/public", { params });
}

/**
 * Lấy chi tiết 1 biến thể - ADMIN
 * Yêu cầu: Token admin
 * @param {number|string} id - ID của biến thể
 * @returns {Promise} Response chứa thông tin chi tiết biến thể
 */
export async function getProductVariantById(id) {
  return await axiosClient.get(`admin/product-variants/${id}`);
}

/**
 * Lấy chi tiết 1 biến thể (PUBLIC - không cần token)
 * API này dùng cho trang user (ProductDetail), không yêu cầu đăng nhập
 * Cả user và admin đều có thể sử dụng API này
 * 
 * Backend tự động filter: chỉ lấy variant có isActive = true cho public
 * Admin sẽ xem được tất cả variants (kể cả isActive = false)
 * 
 * @param {number|string} id - ID của biến thể
 * @returns {Promise} Response chứa thông tin chi tiết biến thể
 */
export async function getPublicProductVariantById(id) {
  return await axiosClient.get(`product-variants/public/${id}`);
}

/**
 * Thêm mới biến thể
 */
export async function createProductVariant(data) {
  return await axiosClient.post("admin/product-variants", data);
}

/**
 * Cập nhật biến thể
 */
export async function updateProductVariant(id, data) {
  return await axiosClient.put(`admin/product-variants/${id}`, data);
}

/**
 * Xóa biến thể
 */
export async function deleteProductVariant(id) {
  return await axiosClient.delete(`admin/product-variants/${id}`);
}

// Default export object chứa tất cả functions
const adminProductVariantsAPI = {
  getProductVariants, // Lấy danh sách variants (admin - cần token)
  getPublicProductVariants, // Lấy danh sách variants (public - không cần token)
  getProductVariantById, // Lấy chi tiết variant (admin - cần token)
  getPublicProductVariantById, // Lấy chi tiết variant (public - không cần token)
  createProductVariant, // Tạo variant mới
  updateProductVariant, // Cập nhật variant
  deleteProductVariant // Xóa variant
};

export default adminProductVariantsAPI;
