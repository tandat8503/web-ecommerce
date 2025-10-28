import axiosClient from "./axiosClient";

/**
 * ========================================
 * WISHLIST API LAYER
 * ========================================
 * 
 * Mục đích:
 * - Gọi API backend để thao tác với wishlist
 * - Được sử dụng bởi Zustand stores
 * 
 * Note:
 * - Zustand KHÔNG THAY THẾ API layer này
 * - Zustand chỉ quản lý STATE, API layer vẫn cần để gọi backend
 * - Components dùng Zustand actions: fetchWishlist()
 */

// ========================================
// API FUNCTIONS
// ========================================

/**
 * Lấy danh sách sản phẩm yêu thích
 * @returns {Promise} - Danh sách wishlist với thông tin sản phẩm đầy đủ
 */
export const getWishlist = async () => {
  return await axiosClient.get("/wishlist");
};

/**
 * Kiểm tra sản phẩm có trong wishlist không
 * @param {number} productId - ID sản phẩm
 * @returns {Promise} - { isInWishlist: boolean }
 * 
 * Note: Function này chỉ dùng nội bộ trong toggleWishlist()
 * Components nên dùng Zustand selector: isInWishlist(productId)
 */
export const checkWishlistStatus = async (productId) => {
  return await axiosClient.get(`/wishlist/check/${productId}`);
};

/**
 * Thêm sản phẩm vào wishlist
 * @param {number} productId - ID sản phẩm
 * @returns {Promise} - Wishlist item vừa thêm
 */
export const addToWishlist = async (productId) => {
  return await axiosClient.post("/wishlist", { productId });
};

/**
 * Xóa sản phẩm khỏi wishlist
 * @param {number} productId - ID sản phẩm
 * @returns {Promise} - Success message
 */
export const removeFromWishlist = async (productId) => {
  return await axiosClient.delete(`/wishlist/${productId}`);
};

/**
 * Xóa tất cả sản phẩm khỏi wishlist
 * @returns {Promise} - { deletedCount: number }
 */
export const clearWishlist = async () => {
  return await axiosClient.delete("/wishlist");
};

/**
 * Toggle wishlist (Thêm nếu chưa có, Xóa nếu đã có)
 * @param {number} productId - ID sản phẩm
 * @returns {Promise} - { action: 'added' | 'removed', isInWishlist: boolean }
 */
export const toggleWishlist = async (productId) => {
  try {
    // Kiểm tra trạng thái hiện tại
    const statusResponse = await checkWishlistStatus(productId);
    const isInWishlist = statusResponse.data.isInWishlist;

    if (isInWishlist) {
      // Nếu đã có => Xóa
      await removeFromWishlist(productId);
      return { action: 'removed', isInWishlist: false };
    } else {
      // Nếu chưa có => Thêm
      await addToWishlist(productId);
      return { action: 'added', isInWishlist: true };
    }
  } catch (error) {
    throw error;
  }
};

