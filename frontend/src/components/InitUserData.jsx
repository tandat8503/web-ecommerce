import { useEffect, useRef, useCallback } from "react";
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
 
 */

export default function InitUserData() {
  const { fetchWishlist } = useWishlistStore();
  const { fetchCart } = useCartStore();
  const isInitialized = useRef(false);
  const lastUserId = useRef(null); // Track userId để detect user switch

  // ✅ Memoize hàm initUserData để tránh stale closure
  const initUserData = useCallback(async (force = false) => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const currentUserId = userStr ? JSON.parse(userStr)?.id : null;

    // Nếu không có token → reset state
    if (!token) {
      useWishlistStore.getState().resetWishlist();
      useCartStore.getState().resetCart();
      isInitialized.current = false;
      lastUserId.current = null;
      return;
    }

    // ✅ Nếu user đã đổi (đăng nhập tài khoản khác) → reset và fetch lại
    if (lastUserId.current !== null && lastUserId.current !== currentUserId) {
      console.log('🚀 InitUserData - User changed, resetting and fetching...');
      isInitialized.current = false;
      useWishlistStore.getState().resetWishlist();
      useCartStore.getState().resetCart();
    }

    // Prevent duplicate initialization (trừ khi force = true)
    if (isInitialized.current && !force && lastUserId.current === currentUserId) {
      console.log('🚀 InitUserData - Already initialized for this user, skipping...')
      return
    }

    try {
      isInitialized.current = true
      lastUserId.current = currentUserId;
      console.log('🚀 InitUserData - Fetching user data...', { userId: currentUserId })
      
      // Fetch song song để tăng performance
      await Promise.all([
        fetchWishlist(),
        fetchCart()
      ]);
      
      console.log('🚀 InitUserData - User data fetched successfully')
    } catch (error) {
      console.error('🚀 InitUserData - Error initializing user data:', error);
      // Không reset state khi có lỗi - giữ nguyên data hiện tại
    }
  }, [fetchWishlist, fetchCart]);

  useEffect(() => {
    // Fetch ngay khi component mount
    initUserData();
  }, [initUserData]);

  // ✅ Listen event userUpdated để fetch lại khi user đăng nhập
  useEffect(() => {
    const handleUserUpdated = () => {
      console.log('🚀 InitUserData - userUpdated event received, fetching data...');
      // Force fetch lại khi có event userUpdated (user đăng nhập)
      initUserData(true);
    };

    window.addEventListener('userUpdated', handleUserUpdated);

    return () => {
      window.removeEventListener('userUpdated', handleUserUpdated);
    };
  }, [initUserData]);

  // Component này không render gì cả
  return null;
}