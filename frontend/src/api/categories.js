import axiosClient from "./axiosClient";

/**
 * Lấy danh sách categories (public - không cần đăng nhập)
 */
export async function getCategories(params) {
  return await axiosClient.get("categories", { params });
}

/**
 * Lấy chi tiết 1 category
 */
export async function getCategoryById(id) {
  return await axiosClient.get(`categories/${id}`);
}

/**
 * Lấy category theo slug
 */
export async function getCategoryBySlug(slug) {
  return await axiosClient.get(`categories/slug/${slug}`);
}

/**
 * Lấy danh sách categories active (chỉ hiển thị categories đang hoạt động)
 */
export async function getActiveCategories(params) {
  return await axiosClient.get("categories/active", { params });
}

/**
 * Tìm kiếm categories
 */
export async function searchCategories(query, params) {
  return await axiosClient.get("categories", { 
    params: { ...params, q: query } 
  });
}

// ========== ADMIN FUNCTIONS ==========
// Các function này cần đăng nhập + quyền admin

/**
 * Lấy danh sách categories (admin)
 */
export async function getAdminCategories(params) {
  return await axiosClient.get("admin/categories", { params });
}

/**
 * Lấy chi tiết 1 category (admin)
 */
export async function getAdminCategoryById(id) {
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