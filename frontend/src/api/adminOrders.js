import axiosClient from "./axiosClient";

/**
 * Lấy danh sách đơn hàng (admin)
 * @param {Object} params - Tham số query: page, limit, status, q
 */
export async function getOrders(params) {
  return await axiosClient.get("admin/orders", { params });
}

/**
 * Lấy chi tiết đơn hàng (admin)
 * @param {number} id - ID đơn hàng
 */
export async function getOrderById(id) {
  return await axiosClient.get(`admin/orders/${id}`);
}

/**
 * Cập nhật trạng thái đơn hàng (admin)
 * @param {number} id - ID đơn hàng
 * @param {Object} data - Dữ liệu cập nhật: status, notes
 */
export async function updateOrder(id, data) {
  return await axiosClient.put(`admin/orders/${id}`, data);
}

/**
 * Hủy đơn hàng (admin)
 * @param {number} id - ID đơn hàng
 * @param {Object} data - Dữ liệu (hiện tại không cần, để trống {})
 * Lưu ý: Backend không nhận adminNote trong cancelOrder, nếu muốn cập nhật ghi chú hãy gọi riêng updateOrderNotes
 */
export async function cancelOrder(id, data = {}) {
  return await axiosClient.put(`admin/orders/${id}/cancel`, data);
}

/**
 * Cập nhật chỉ ghi chú admin (không thay đổi status)
 * @param {number} id - ID đơn hàng
 * @param {string} notes - Ghi chú admin
 */
export async function updateOrderNotes(id, notes) {
  return await axiosClient.put(`admin/orders/${id}/notes`, { notes });
}

/**
 * Lấy thống kê đơn hàng (admin)
 * @param {Object} params - Tham số query: period (7d, 30d, 90d, 1y)
 */
export async function getOrderStats(params) {
  return await axiosClient.get("admin/orders/stats", { params });
}

/**
 * Lấy thống kê doanh thu theo danh mục sản phẩm (admin) - Dùng cho Rose Chart
 * @param {Object} params - Tham số query: period (7d, 30d, 90d, 1y, all)
 * @returns {Promise} - { data: [{ category: "Tên danh mục", revenue: 1000000 }, ...] }
 */
export async function getRevenueByCategory(params) {
  return await axiosClient.get("admin/orders/revenue-by-category", { params });
}

/**
 * Lấy top sản phẩm bán chạy nhất (admin)
 * @param {Object} params - Tham số query: period (7d, 30d, 90d, 1y, all), limit (mặc định: 10)
 * @returns {Promise} - { data: [{ productName, totalQuantity }, ...] }
 */
export async function getTopProducts(params) {
  return await axiosClient.get("admin/orders/top-products", { params });
}


