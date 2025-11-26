import axiosClient from "./axiosClient";

/**
 * Lấy danh sách tỉnh/thành phố từ GHN
 */
export async function getGHNProvinces() {
  return await axiosClient.get("/shipping/provinces");
}

/**
 * Lấy danh sách quận/huyện theo tỉnh/thành phố
 * @param {number} provinceId - ID tỉnh/thành phố
 */
export async function getGHNDistricts(provinceId) {
  return await axiosClient.post("/shipping/districts", { provinceId });
}

/**
 * Lấy danh sách phường/xã theo quận/huyện
 * @param {number} districtId - ID quận/huyện
 */
export async function getGHNWards(districtId) {
  return await axiosClient.post("/shipping/wards", { districtId });
}

/**
 * Tính phí vận chuyển GHN
 * @param {Object} params - Thông tin tính phí
 * @param {number} params.toDistrictId - ID quận/huyện nhận hàng
 * @param {string} params.toWardCode - Mã phường/xã nhận hàng
 * @param {number} params.weight - Trọng lượng (gram)
 * @param {number} params.length - Chiều dài (cm)
 * @param {number} params.width - Chiều rộng (cm)
 * @param {number} params.height - Chiều cao (cm)
 * @param {number} params.serviceTypeId - Loại dịch vụ (2: Standard, 5: Express)
 * @param {number} params.insuranceValue - Giá trị đơn hàng (để tính bảo hiểm)
 */
export async function calculateGHNShippingFee(params) {
  return await axiosClient.post("/shipping/calculate-fee", params);
}

/**
 * Lấy danh sách dịch vụ vận chuyển có sẵn
 * @param {Object} params
 * @param {number} params.toDistrictId - ID quận/huyện nhận hàng
 * @param {string} params.toWardCode - Mã phường/xã nhận hàng
 */
export async function getGHNAvailableServices(params) {
  return await axiosClient.post("/shipping/available-services", params);
}

/**
 * Tính thời gian giao hàng
 * @param {Object} params
 * @param {number} params.toDistrictId - ID quận/huyện nhận hàng
 * @param {string} params.toWardCode - Mã phường/xã nhận hàng
 * @param {number} params.serviceId - ID dịch vụ
 */
export async function getGHNLeadTime(params) {
  return await axiosClient.post("/shipping/leadtime", params);
}

/**
 * Lấy thông tin tracking đơn hàng GHN
 * @param {string} ghnOrderCode - Mã đơn hàng GHN
 */
export async function getGHNShippingTracking(ghnOrderCode) {
  return await axiosClient.get(`/shipping/tracking/${ghnOrderCode}`);
}

/**
 * Hủy đơn vận chuyển GHN
 * @param {string} ghnOrderCode - Mã đơn hàng GHN
 */
export async function cancelGHNShipping(ghnOrderCode) {
  return await axiosClient.post(`/shipping/cancel/${ghnOrderCode}`);
}

