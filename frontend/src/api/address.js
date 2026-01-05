import axiosClient from "./axiosClient";

/**
 * Lấy danh sách tất cả địa chỉ (địa chỉ mặc định lên đầu)
 */
export async function getAddresses() {
  return await axiosClient.get("/addresses");
}

/**
 * Lấy địa chỉ mặc định (nếu có)
 */
export async function getDefaultAddress() {
  return await axiosClient.get("/addresses/default");
}

/**
 * Lấy chi tiết địa chỉ theo ID
 */
export async function getAddressById(id) {
  return await axiosClient.get(`/addresses/${id}`);
}

/**
 * Thêm địa chỉ mới
 */
export async function addAddress(data) {
  return await axiosClient.post("/addresses", data);
}

/**
 * Cập nhật địa chỉ
 */
export async function updateAddress(id, data) {
  return await axiosClient.put(`/addresses/${id}`, data);
}

/**
 * Đặt địa chỉ mặc định
 */
export async function setDefaultAddress(id) {
  return await axiosClient.put(`/addresses/${id}/set-default`);
}

/**
 * Xóa địa chỉ
 */
export async function deleteAddress(id) {
  return await axiosClient.delete(`/addresses/${id}`);
}

