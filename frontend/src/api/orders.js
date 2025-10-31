import axiosClient from "./axiosClient";

// Tạo đơn hàng
export const createOrder = async (data) => {
  return await axiosClient.post("/orders", data);
};

// Danh sách đơn hàng của user (phân trang, lọc trạng thái)
export const getUserOrders = async (params) => {
  return await axiosClient.get("/orders", { params });
};

// Chi tiết đơn hàng
export const getOrderById = async (id) => {
  return await axiosClient.get(`/orders/${id}`);
};

// Hủy đơn
export const cancelOrder = async (id) => {
  return await axiosClient.put(`/orders/${id}/cancel`);
};

// Xác nhận đã nhận hàng
export const confirmReceivedOrder = async (id) => {
  return await axiosClient.put(`/orders/${id}/confirm-received`);
};


