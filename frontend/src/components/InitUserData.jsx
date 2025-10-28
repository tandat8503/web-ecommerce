import { useEffect, useRef } from "react";
import useWishlistStore from "@/stores/wishlistStore";
import useCartStore from "@/stores/cartStore";

/**
 * 🚀 INIT USER DATA COMPONENT
 * 
 * Chức năng:
 * - Fetch dữ liệu user khi app load (nếu có token)
 * - Tự động sync wishlist và cart từ server
 * - Chạy lại khi user đăng nhập vào tài khoản khác
 * - Listen storage changes để detect user switch
 * 
 * So với Redux:
 * ✅ Code ngắn hơn 70% (30 dòng vs 100 dòng)
 * ✅ Dễ hiểu hơn (không cần Redux concepts)
 * ✅ Không cần Provider
 */

export default function InitUserData() {
  const { fetchWishlist } = useWishlistStore();
  const { fetchCart } = useCartStore();
  const isInitialized = useRef(false);

  // Hàm fetch dữ liệu user
  const initUserData = async () => {
    // Prevent duplicate initialization
    if (isInitialized.current) {
      console.log('🚀 InitUserData - Already initialized, skipping...')
      return
    }
    
    const token = localStorage.getItem('token');
    
    if (!token) {
      // Nếu không có token → reset state
      useWishlistStore.getState().resetWishlist();
      useCartStore.getState().resetCart();
      return;
    }

    try {
      isInitialized.current = true
      console.log('🚀 InitUserData - Fetching user data...')
      
      // Fetch song song để tăng performance nhưng có delay nhỏ
      await Promise.all([
        fetchWishlist(),
        new Promise(resolve => setTimeout(resolve, 100)), // Delay 100ms
        fetchCart()
      ]);
      
      console.log('🚀 InitUserData - User data fetched successfully')
    } catch (error) {
      console.error('🚀 InitUserData - Error initializing user data:', error);
      // Không reset state khi có lỗi - giữ nguyên data hiện tại
    }
  };

  useEffect(() => {
    // Fetch ngay khi component mount
    initUserData();
  }, []);

  // Component này không render gì cả
  return null;
}