import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "@/api/auth";
import { toast } from "@/lib/utils";
import { getPublicCategories } from "@/api/adminCategories";
import useWishlistStore from "@/stores/wishlistStore";
import useCartStore from "@/stores/cartStore";

/**
 * Custom hook quản lý toàn bộ logic cho UserHeader
 * Bao gồm: user state, categories, logout, wishlist/cart counts
 * 
 * @returns {Object} Object chứa:
 *   - State: user, loadingLogout, categories, loadingCategories, wishlistCount
 *   - Handlers: handleLogout
 * 
 * Lưu ý: cartCount không được trả về vì CartIconButton tự lấy từ Zustand store
 */
export function useUserHeader() {
  const [user, setUser] = useState(null);
  const [loadingLogout, setLoadingLogout] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const navigate = useNavigate();
  
  // ========== ZUSTAND - Lấy số lượng wishlist và cart từ Zustand stores ==========
  const { resetWishlist } = useWishlistStore();
  const { resetCart } = useCartStore();
  
  // ✅ Subscribe vào store để trigger re-render khi state thay đổi
  // Lưu ý: cartCount không cần ở đây vì CartIconButton tự lấy từ store
  const wishlistCount = useWishlistStore((state) => state.items.length);

  // ========== EFFECT HOOKS ==========
  
  /**
   * Lấy danh mục public từ API
   */
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const res = await getPublicCategories();
        setCategories(res.data.items || []);
      } catch (error) {
        console.error("Lỗi tải danh mục:", error);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  /**
   * Lấy thông tin user từ localStorage và lắng nghe event userUpdated
   */
  useEffect(() => {
    const loadUserData = () => {
      const userData = localStorage.getItem("user");
      if (userData) {
        try {
          setUser(JSON.parse(userData));
        } catch (error) {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
        }
      }
    };

    loadUserData();
    
    // Lắng nghe event userUpdated từ LoginForm/RegisterForm/ProfileManager
    const handleUserUpdated = () => {
      loadUserData();
    };
    
    window.addEventListener("userUpdated", handleUserUpdated);
    
    // Cleanup khi component unmount
    return () => {
      window.removeEventListener("userUpdated", handleUserUpdated);
    };
  }, []);

  // ========== HANDLERS ==========
  
  /**
   * Xử lý đăng xuất
   * - Gọi API logout
   * - Xóa localStorage (token, user)
   * - Reset Zustand stores (wishlist, cart)
   * - Navigate về trang chủ
   */
  const handleLogout = async () => {
    try {
      setLoadingLogout(true);
      await logout();
      
      // Xóa localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      
      // ✨ QUAN TRỌNG: Reset Zustand wishlist và cart state khi logout
      // Để badge số lượng wishlist và cart biến mất ngay lập tức
      resetWishlist();
      resetCart();
      
      toast.success(" Đăng xuất thành công!");
      navigate("/");
    } catch (error) {
      toast.error("❌ Có lỗi xảy ra khi đăng xuất", { autoClose: 3000 });
    } finally {
      setLoadingLogout(false);
    }
  };

  // ========== RETURN ==========
  return {
    // ===== STATE =====
    user,                    // Thông tin user từ localStorage
    loadingLogout,           // Trạng thái loading khi đăng xuất
    categories,              // Danh sách danh mục public
    loadingCategories,       // Trạng thái loading khi tải danh mục
    wishlistCount,          // Số lượng wishlist (từ Zustand)
    // Lưu ý: cartCount không cần vì CartIconButton tự lấy từ Zustand store
    
    // ===== HANDLERS =====
    handleLogout,           // Hàm xử lý đăng xuất
  };
}

