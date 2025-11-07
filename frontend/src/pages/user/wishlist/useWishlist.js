import { useState, useEffect } from "react";
import useWishlistStore from "@/stores/wishlistStore";

/**
 * Custom hook quản lý toàn bộ logic cho trang Wishlist
 * Bao gồm: fetch wishlist, clear wishlist, loading states
 * 
 * @returns {Object} Object chứa:
 *   - State: wishlist, wishlistCount, loading, isInitialLoad
 *   - Handlers: handleClearAll
 */
export function useWishlist() {
  // ========== ZUSTAND HOOKS ==========
  const { items: wishlist, getWishlistCount, loading, fetchWishlist, clearWishlist } = useWishlistStore();
  const wishlistCount = getWishlistCount();
  
  // ========== LOCAL STATE ==========
  /**
   * State để track lần đầu load trang
   * - true: Đang load lần đầu (hiển thị skeleton)
   * - false: Đã load xong (hiển thị data hoặc empty state)
   */
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // ========== EFFECT HOOKS ==========
  
  /**
   * Fetch wishlist khi component mount
   * - Tạo delay tối thiểu 1s để skeleton hiển thị đẹp hơn
   * - Sau khi fetch xong, set isInitialLoad = false
   */
  useEffect(() => {
    const loadData = async () => {
      // Tạo 2 promises: fetch data và delay tối thiểu 1s
      const fetchPromise = fetchWishlist();
      const delayPromise = new Promise(resolve => setTimeout(resolve, 1000));
      
      // Đợi cả 2 promises hoàn thành
      await Promise.all([fetchPromise, delayPromise]);
      
      // Sau khi cả 2 xong, tắt skeleton
      setIsInitialLoad(false);
    };
    
    loadData();
    
  }, []); // Chỉ chạy 1 lần khi mount

  // ========== HANDLERS ==========
  
  /**
   * Xóa tất cả sản phẩm khỏi wishlist
   */
  const handleClearAll = async () => {
    if (wishlistCount === 0) return;
    
    try {
      await clearWishlist();
    } catch (error) {
      console.error('Clear all failed:', error);
    }
  };

  // ========== RETURN ==========
  return {
    // ===== STATE =====
    wishlist,          // Danh sách wishlist items (từ Zustand store)
    wishlistCount,     // Số lượng sản phẩm trong wishlist
    loading,           // Trạng thái loading (từ Zustand store)
    isInitialLoad,     // Trạng thái load lần đầu (để hiển thị skeleton)
    
    // ===== HANDLERS =====
    handleClearAll,    // Hàm xóa tất cả wishlist
  };
}

