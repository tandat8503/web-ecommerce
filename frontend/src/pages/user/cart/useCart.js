import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useCartStore from "@/stores/cartStore";

/**
 * ========================================
 * USE CART HOOK - XỬ LÝ LOGIC GIỎ HÀNG ✨
 * =======================================
 * 
 * Hook này chứa TẤT CẢ logic cho trang Cart
 * Component Cart.jsx chỉ cần import và sử dụng
 */
export function useCart() {
  const navigate = useNavigate();
  
  // =======================
  // STATE TỪ CART STORE
  // =======================
  const { 
    items: cartItems, //danh sách sản phẩm trong giỏ hàng từ cartStore.js
    totalQuantity: cartCount, //số lượng sản phẩm trong giỏ hàng từ store cartStore.js
    loading, //trạng thái loading từ store cartStore.js
    fetchCart, //hàm lấy danh sách sản phẩm trong giỏ hàng từ store cartStore.js
    updateCartItem, //hàm cập nhật số lượng sản phẩm trong giỏ hàng từ store cartStore.js
    removeFromCart, //hàm xóa sản phẩm khỏi giỏ hàng từ store cartStore.js
    clearCart //hàm xóa tất cả sản phẩm khỏi giỏ hàng từ store cartStore.js
  } = useCartStore();
  
  // =======================
  // LOCAL STATE
  // =======================
  const [updatingItems, setUpdatingItems] = useState(new Set()); // Set các item IDs đang được cập nhật
  const [selectedItems, setSelectedItems] = useState(new Set()); // Set các item IDs đã được chọn bằng checkbox

  // =======================
  // EFFECTS
  // =======================
  // Fetch giỏ hàng khi component mount
  useEffect(() => {
    fetchCart(); //gọi hàm fetchCart từ cartStore.js để lấy danh sách sản phẩm trong giỏ hàng
  }, [fetchCart]);

  // =======================
  // HANDLERS
  // =======================
  
  /**
   * Cập nhật số lượng sản phẩm trong giỏ hàng
   */
  const handleUpdateQuantity = async (cartItemId, newQuantity) => {
    if (newQuantity < 1) return; // Không cho phép số lượng < 1
    setUpdatingItems(prev => new Set(prev).add(cartItemId)); // thêm cartItemId vào danh sách "đang cập nhật"
    try {
      await updateCartItem({ cartItemId, quantity: newQuantity }); //gọi hàm updateCartItem từ cartStore.js để cập nhật số lượng sản phẩm trong giỏ hàng
    } finally {
      setUpdatingItems(prev => new Set([...prev].filter(id => id !== cartItemId))); //xóa cartItemId khỏi danh sách "đang cập nhật"
    }
  };

  /**
   * Xóa một sản phẩm khỏi giỏ hàng
   */
  const handleRemoveItem = async (cartItemId) => {
    await removeFromCart(cartItemId); // Gọi API xóa
  };

  /**
   * Xóa tất cả sản phẩm khỏi giỏ hàng
   */
  const handleClearAll = async () => {
    await clearCart(); // Gọi API xóa tất cả
  };

  /**
   * Chọn/bỏ chọn tất cả sản phẩm
   */
  const handleSelectAll = (checked) => {
    setSelectedItems(checked ? new Set(cartItems.map(item => item.id)) : new Set()); //nếu checked = true thì thêm tất cả item IDs vào selectedItems, nếu checked = false thì xóa tất cả IDs khỏi selectedItems (Set rỗng)
  };

  /**
   * Chọn/bỏ chọn một sản phẩm cụ thể
   */
  const handleSelectItem = (itemId, checked) => {
    const newSelectedItems = new Set(selectedItems); // Tạo bản sao
    if (checked) newSelectedItems.add(itemId); // Thêm vào Set
    else newSelectedItems.delete(itemId); // Xóa khỏi Set
    setSelectedItems(newSelectedItems); // Cập nhật state
  };

  /**
   * Xóa tất cả sản phẩm đã chọn
   */
  const handleDeleteSelected = async () => {
    for (const itemId of selectedItems) { // Lặp qua các item đã chọn
      await removeFromCart(itemId); // Xóa từng item
    }
    setSelectedItems(new Set()); // Xóa tất cả selection
  };

  /**
   * Chuyển đến trang checkout với các sản phẩm đã chọn
   */
  const handleCheckout = () => {
    const ids = Array.from(selectedItems);
    //nếu có sản phẩm đã chọn thì chuyển đến trang checkout với các sản phẩm đã chọn, nếu không thì chuyển đến trang sản phẩm
    navigate(`/checkout${ids.length ? `?selected=${ids.join(',')}` : ''}`);
  };

  /**
   * Chuyển đến trang sản phẩm
   */
  const handleContinueShopping = () => {
    navigate("/san-pham");
  };

  // =======================
  // HELPER FUNCTIONS
  // =======================
  
  /**
   * Tính tổng tiền của các sản phẩm đã chọn
   */
  const getSelectedTotalAmount = () => {
    return cartItems
      .filter(item => selectedItems.has(item.id)) // Chỉ lấy item đã chọn
      .reduce((total, item) => total + (item.finalPrice * item.quantity), 0); // Tính tổng tiền
  };

  /**
   * Đếm số loại sản phẩm đã chọn
   */
  const getSelectedCount = () => {
    return cartItems
      .filter(item => selectedItems.has(item.id)) // Chỉ lấy item đã chọn
      .length; // Đếm số loại sản phẩm đã chọn, không phải tổng quantity
  };

  // =======================
  // RETURN
  // =======================
  return {
    // State
    cartItems,
    cartCount,
    loading,
    updatingItems,
    selectedItems,
    
    // Handlers
    handleUpdateQuantity,
    handleRemoveItem,
    handleClearAll,
    handleSelectAll,
    handleSelectItem,
    handleDeleteSelected,
    handleCheckout,
    handleContinueShopping,
    
    // Helpers
    getSelectedTotalAmount,
    getSelectedCount,
  };
}

