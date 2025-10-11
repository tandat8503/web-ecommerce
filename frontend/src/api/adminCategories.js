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
  return await axiosClient.post("admin/categories", data,{
    headers: { "Content-Type": "multipart/form-data" },
  });
}

/**
 * Cập nhật category (admin)
 */
export async function updateCategory(id, data) {
  return await axiosClient.put(`admin/categories/${id}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

/**
 * Xóa category (admin)
 */
export async function deleteCategory(id) {
  return await axiosClient.delete(`admin/categories/${id}`);
}


/**
 * ✅ Lấy danh sách categories cho user (public)
 *    Không cần token
 */
export async function getPublicCategories() {
  const res = await axiosClient.get("admin/categories/public");
  return { data: res.data }; // bọc lại cho tương thích với các chỗ khác
}



// Default export object chứa tất cả functions (để tương thích với AdminProducts, AdminBrands)
const adminCategoriesAPI = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};

export default adminCategoriesAPI;