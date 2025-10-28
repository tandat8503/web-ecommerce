// Import axios client đã được cấu hình sẵn với base URL và interceptors
import axiosClient from './axiosClient';

/**
 * Lấy danh sách sản phẩm với phân trang và tìm kiếm (admin)
 * Yêu cầu: Token admin
 * @param {Object} params - Tham số query: page, limit, q, categoryId, brandId, status
 * @returns {Promise} Response chứa danh sách sản phẩm và thông tin phân trang
 */
export async function getProducts(params) {
  return await axiosClient.get('admin/products', { params });
}

/**
 * Lấy danh sách sản phẩm PUBLIC (không cần token)
 * API này dùng cho trang user, tự động chỉ lấy sản phẩm ACTIVE
 * Cả user và admin đều có thể sử dụng API này
 * @param {Object} params - Tham số query: page, limit, q, categoryId, brandId
 * @returns {Promise} Response chứa danh sách sản phẩm ACTIVE và thông tin phân trang
 */
export async function getPublicProducts(params) {
  return await axiosClient.get('admin/products/public', { params });
}

/**
 * Lấy chi tiết một sản phẩm theo ID (admin)
 * Yêu cầu: Token admin
 * @param {number|string} id - ID của sản phẩm
 * @returns {Promise} Response chứa thông tin chi tiết sản phẩm
 */
export async function getProductById(id) {
  return await axiosClient.get(`admin/products/${id}`);
}

/**
 * Lấy chi tiết một sản phẩm theo ID (PUBLIC - không cần token)
 * API này dùng cho trang user (ProductDetail), không yêu cầu đăng nhập
 * Cả user và admin đều có thể sử dụng API này
 * @param {number|string} id - ID của sản phẩm
 * @returns {Promise} Response chứa thông tin chi tiết sản phẩm
 */
export async function getPublicProductById(id) {
  return await axiosClient.get(`admin/products/public/${id}`);
}


/**
 * Tạo sản phẩm mới với upload ảnh (admin)
 * @param {FormData} data - Dữ liệu sản phẩm bao gồm ảnh
 * @returns {Promise} Response chứa thông tin sản phẩm vừa tạo
 */
export async function createProduct(data) {
  return await axiosClient.post('admin/products', data, {
    headers: { "Content-Type": "multipart/form-data" }, // Cần thiết cho upload file
  });
}

/**
 * Cập nhật thông tin sản phẩm với upload ảnh (admin)
 * @param {number|string} id - ID của sản phẩm cần cập nhật
 * @param {FormData} data - Dữ liệu sản phẩm mới (có thể bao gồm ảnh)
 * @returns {Promise} Response chứa thông tin sản phẩm đã cập nhật
 */
export async function updateProduct(id, data) {
  return await axiosClient.put(`admin/products/${id}`, data, {
    headers: { "Content-Type": "multipart/form-data" }, // Cần thiết cho upload file
  });
}

/**
 * Xóa sản phẩm (admin)
 * @param {number|string} id - ID của sản phẩm cần xóa
 * @returns {Promise} Response xác nhận xóa thành công
 */
export async function deleteProduct(id) {
  return await axiosClient.delete(`admin/products/${id}`);
}

/**
 * Lấy sản phẩm theo category với phân trang và sắp xếp (admin)
 * API mới được thêm để hiển thị sản phẩm theo danh mục trên UI
 * @param {number|string} categoryId - ID của category
 * @param {Object} params - Tham số phân trang và sắp xếp
 * @param {number} params.page - Số trang (mặc định: 1)
 * @param {number} params.limit - Số sản phẩm mỗi trang (mặc định: 10)
 * @param {string} params.sortBy - Field để sắp xếp (mặc định: 'createdAt')
 * @param {string} params.sortOrder - Thứ tự sắp xếp 'asc' hoặc 'desc' (mặc định: 'desc')
 * @returns {Promise} Response chứa danh sách sản phẩm, thông tin category và pagination
 */
export async function getProductsByCategory(categoryId, params = {}) {
  // Destructure params với giá trị mặc định
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = params;
  
  // Gọi API với categoryId trong URL và các tham số khác trong query string
  return await axiosClient.get(`admin/products/category/${categoryId}`, {
    params: { page, limit, sortBy, sortOrder }
  });
}




// Default export object chứa tất cả functions (để tương thích với Dashboard)
// Object này được sử dụng khi import toàn bộ module: import adminProductsAPI from './adminProducts'
const adminProductsAPI = {
  getProducts, // Lấy danh sách sản phẩm (admin - cần token)
  getPublicProducts, // Lấy danh sách sản phẩm (public - không cần token)
  getProductById, // Lấy chi tiết sản phẩm (admin - cần token)
  getPublicProductById, // Lấy chi tiết sản phẩm (public - không cần token)
  createProduct, // Tạo sản phẩm mới
  updateProduct, // Cập nhật sản phẩm
  deleteProduct, // Xóa sản phẩm
  getProductsByCategory // Lấy sản phẩm theo category (API mới)
};

export default adminProductsAPI;
