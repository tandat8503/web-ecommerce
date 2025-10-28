import axiosClient from "./axiosClient";




/**
 * Lấy giỏ hàng của user
 * @returns {Promise} - Danh sách giỏ hàng với thông tin sản phẩm đầy đủ
 */
export const getCart = async () => {
  return await axiosClient.get("/cart");
};

/**
 * Lấy số lượng sản phẩm trong giỏ hàng
 * @returns {Promise} - { totalQuantity: number }
 */
export const getCartCount = async () => {
  return await axiosClient.get("/cart/count");
};

/**
 * Thêm sản phẩm vào giỏ hàng
 * @param {Object} cartData - { productId, variantId?, quantity }
 * @returns {Promise} - Cart item vừa thêm
 */
export const addToCart = async (cartData) => {
  return await axiosClient.post("/cart/add", cartData);
};

/**
 * Cập nhật số lượng sản phẩm trong giỏ hàng
 * @param {number} cartItemId - ID cart item
 * @param {number} quantity - Số lượng mới
 * @returns {Promise} - Cart item đã cập nhật
 */
export const updateCartItem = async (cartItemId, quantity) => {
  return await axiosClient.put(`/cart/update/${cartItemId}`, { quantity });
};

/**
 * Xóa sản phẩm khỏi giỏ hàng
 * @param {number} cartItemId - ID cart item
 * @returns {Promise} - Success message
 */
export const removeFromCart = async (cartItemId) => {
  return await axiosClient.delete(`/cart/remove/${cartItemId}`);
};

/**
 * Xóa tất cả sản phẩm khỏi giỏ hàng
 * @returns {Promise} - { removedCount: number }
 */
export const clearCart = async () => {
  return await axiosClient.delete("/cart/clear");
};
