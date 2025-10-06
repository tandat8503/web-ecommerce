import axiosClient from "./axiosClient";

/**
 * Lấy danh sách biến thể (có thể truyền productId để lọc)
 */
export async function getProductVariants(params) {
  return await axiosClient.get("admin/product-variants", { params });
}

/**
 * Lấy chi tiết 1 biến thể
 */
export async function getProductVariantById(id) {
  return await axiosClient.get(`admin/product-variants/${id}`);
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
