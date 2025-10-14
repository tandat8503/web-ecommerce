import axiosClient from "./axiosClient";

// ============================
// LẤY SẢN PHẨM THEO SLUG DANH MỤC (CHO USER)
// ============================
export const getProductsByCategorySlug = async (slug, params = {}) => {
  try {
    console.log("🔗 Gọi API:", `/admin/products/category/${slug}`);
    const response = await axiosClient.get(`/admin/products/category/${slug}`, { params });
    console.log("📡 Response status:", response.status);
    console.log("📦 Response data:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Lỗi khi lấy sản phẩm theo danh mục:", error);
    console.error("📊 Error response:", error.response?.data);
    console.error("🔗 Error URL:", error.config?.url);
    throw error;
  }
};

// ============================
// LẤY TẤT CẢ SẢN PHẨM (CHO USER)
// ============================
export const getAllProducts = async (params = {}) => {
  try {
    const response = await axiosClient.get("/products", { params });
    return response.data;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách sản phẩm:", error);
    throw error;
  }
};

// ============================
// LẤY SẢN PHẨM THEO ID (CHO USER)
// ============================
export const getProductById = async (id) => {
  try {
    const response = await axiosClient.get(`/products/${id}`);
    return response.data;
  } catch (error) {
    console.error("Lỗi khi lấy chi tiết sản phẩm:", error);
    throw error;
  }
};
