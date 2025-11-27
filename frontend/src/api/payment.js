import axiosClient from "./axiosClient";

/**
 * Tạo payment URL từ VNPay
 * @param {number} orderId - ID của đơn hàng
 * @returns {Promise} - Payment URL và thông tin thanh toán
 */
export const createVNPayPayment = async (orderId) => {
  return await axiosClient.post("/payment/vnpay/create", { orderId });
};

/**
 * Kiểm tra trạng thái thanh toán
 * @param {number} orderId - ID của đơn hàng
 * @returns {Promise} - Trạng thái thanh toán
 */
export const getPaymentStatus = async (orderId) => {
  return await axiosClient.get(`/payment/status/${orderId}`);
};
