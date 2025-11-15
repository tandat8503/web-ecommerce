import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useCartStore from "@/stores/cartStore";

/**
 * 🛒 USE CART HOOK - Logic xử lý giỏ hàng
 */
export function useCart() {
  const navigate = useNavigate();
  const { 
    items: cartItems,
    totalQuantity: cartCount,
    loading,
    fetchCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    selectedIds,
    setSelectedIds,
    addSelectedId,
    removeSelectedId,
    clearSelected
  } = useCartStore();
  
  const [updatingItems, setUpdatingItems] = useState(new Set());

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

//hàm cập nhật số lượng sản phẩm
  const handleUpdateQuantity = async (cartItemId, newQuantity) => {
    if (newQuantity < 1) return;
    setUpdatingItems(prev => new Set(prev).add(cartItemId));
    try {
      await updateCartItem({ cartItemId, quantity: newQuantity });
    } finally {
      setUpdatingItems(prev => new Set([...prev].filter(id => id !== cartItemId)));
    }
  };
//hàm xóa sản phẩm
  const handleRemoveItem = async (cartItemId) => {
    await removeFromCart(cartItemId);
  };
//hàm xóa tất cả sản phẩm
  const handleClearAll = async () => {
    await clearCart();
    clearSelected();
  };
//hàm chọn tất cả sản phẩm
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(cartItems.map(item => item.id));
    } else {
      clearSelected();
    }
  };
//hàm chọn sản phẩm
  const handleSelectItem = (itemId, checked) => {
    if (checked) {
      addSelectedId(itemId);
    } else {
      removeSelectedId(itemId);
    }
  };
//hàm xóa sản phẩm đã chọn
  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    for (const itemId of ids) {
      await removeFromCart(itemId);
      removeSelectedId(itemId);
    }
  };
//hàm chuyển hướng đến trang thanh toán
  const handleCheckout = () => {
    const ids = Array.from(selectedIds);
    navigate(`/checkout${ids.length ? `?selected=${ids.join(',')}` : ''}`);
  };
//hàm chuyển hướng đến trang sản phẩm
  const handleContinueShopping = () => {
    navigate("/");
  };
//hàm lấy tổng tiền của sản phẩm đã chọn
  const getSelectedTotalAmount = () => {
    return cartItems
      .filter(item => selectedIds.has(item.id))
      .reduce((total, item) => total + (item.final_price * item.quantity), 0);
  };
//hàm lấy số lượng sản phẩm đã chọn
  const getSelectedCount = () => {
    return Array.from(selectedIds).length;
  };

  return {
    cartItems,
    cartCount,
    loading,
    updatingItems,
    selectedItems: selectedIds,
    handleUpdateQuantity,
    handleRemoveItem,
    handleClearAll,
    handleSelectAll,
    handleSelectItem,
    handleDeleteSelected,
    handleCheckout,
    handleContinueShopping,
    getSelectedTotalAmount,
    getSelectedCount,
  };
}

