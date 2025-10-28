// Import axios client đã được cấu hình sẵn với base URL và interceptors
import axiosClient from './axiosClient';

/**
 * Lấy danh sách mã giảm giá với phân trang và tìm kiếm (admin)
 * Yêu cầu: Token admin
 * @param {Object} params - Tham số query: page, limit, q, status
 * @returns {Promise} Response chứa danh sách mã giảm giá và thông tin phân trang
 */
export async function getCoupons(params) {
  return await axiosClient.get('admin/coupons', { params });
}

/**
 * Lấy chi tiết một mã giảm giá theo ID (admin)
 * Yêu cầu: Token admin
 * @param {number|string} id - ID của mã giảm giá
 * @returns {Promise} Response chứa thông tin chi tiết mã giảm giá
 */
export async function getCouponById(id) {
  return await axiosClient.get(`admin/coupons/${id}`);
}

/**
 * Tạo mã giảm giá mới (admin)
 * @param {Object} data - Dữ liệu mã giảm giá
 * @returns {Promise} Response chứa thông tin mã giảm giá vừa tạo
 */
export async function createCoupon(data) {
  return await axiosClient.post('admin/coupons', data);
}

/**
 * Cập nhật thông tin mã giảm giá (admin)
 * @param {number|string} id - ID của mã giảm giá cần cập nhật
 * @param {Object} data - Dữ liệu mã giảm giá mới
 * @returns {Promise} Response chứa thông tin mã giảm giá đã cập nhật
 */
export async function updateCoupon(id, data) {
  return await axiosClient.put(`admin/coupons/${id}`, data);
}

/**
 * Xóa mã giảm giá (admin)
 * @param {number|string} id - ID của mã giảm giá cần xóa
 * @returns {Promise} Response xác nhận xóa thành công
 */
export async function deleteCoupon(id) {
  return await axiosClient.delete(`admin/coupons/${id}`);
}

// Default export object chứa tất cả functions
const adminCouponsAPI = {
  getCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon
};

export default adminCouponsAPI;
