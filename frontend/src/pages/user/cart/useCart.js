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
    totalAmount,
    loading,
    fetchCart,
    updateCartItem,
    removeFromCart,
    clearCart
  } = useCartStore();
  
  const [updatingItems, setUpdatingItems] = useState(new Set());

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Cập nhật số lượng sản phẩm
  const handleUpdateQuantity = async (cartItemId, newQuantity) => {
    if (newQuantity < 1) return;
    setUpdatingItems(prev => new Set(prev).add(cartItemId));
    try {
      await updateCartItem({ cartItemId, quantity: newQuantity });
    } finally {
      setUpdatingItems(prev => new Set([...prev].filter(id => id !== cartItemId)));
    }
  };

  // Xóa sản phẩm
  const handleRemoveItem = async (cartItemId) => {
    await removeFromCart(cartItemId);
  };

  // Xóa tất cả sản phẩm
  const handleClearAll = async () => {
    await clearCart();
  };

  // Chuyển đến trang thanh toán (tất cả items trong giỏ)
  const handleCheckout = () => {
    const ids = cartItems.map(item => item.id);
    navigate(`/checkout?selected=${ids.join(',')}`);
  };

  // Tiếp tục mua sắm
  const handleContinueShopping = () => {
    navigate("/");
  };

  return {
    cartItems,
    cartCount,
    totalAmount,
    loading,
    updatingItems,
    handleUpdateQuantity,
    handleRemoveItem,
    handleClearAll,
    handleCheckout,
    handleContinueShopping,
  };
}

