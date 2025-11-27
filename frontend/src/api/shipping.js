import axiosClient from "./axiosClient";

/**
 * Tính phí vận chuyển qua GHN
 * @param {Object} payload
 * @param {number} payload.toDistrictId - DistrictID đích (GHN)
 * @param {string} payload.toWardCode - WardCode đích (GHN)
 * @param {number} [payload.weight] - Trọng lượng (gram)
 * @param {number} [payload.length] - Chiều dài (cm)
 * @param {number} [payload.width] - Chiều rộng (cm)
 * @param {number} [payload.height] - Chiều cao (cm)
 * @param {number} [payload.codAmount] - Tiền thu hộ (nếu COD)
 * @param {number} [payload.serviceTypeId] - Loại dịch vụ GHN (1: Nhanh, 2: Chuẩn, 3: Tiết kiệm)
 */
export async function calculateShippingFee(payload) {
  return axiosClient.post("/ghn/calculate-shipping-fee", payload);
}


