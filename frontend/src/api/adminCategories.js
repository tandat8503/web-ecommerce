import axiosClient from "./axiosClient";

/**
 * Lấy danh sách categories (admin)
 */
export async function getCategories(params) {
  return await axiosClient.get("admin/categories", { params });
}

/**
 * Lấy chi tiết 1 category (admin)
 */
export async function getCategoryById(id) {
  return await axiosClient.get(`admin/categories/${id}`);
}

/**
 * Thêm mới category (admin)
 */
export async function createCategory(data) {
  return await axiosClient.post("admin/categories", data);
}

/**
 * Cập nhật category (admin)
 */
export async function updateCategory(id, data) {
  return await axiosClient.put(`admin/categories/${id}`, data);
}

/**
 * Xóa category (admin)
 */
export async function deleteCategory(id) {
  return await axiosClient.delete(`admin/categories/${id}`);
}
