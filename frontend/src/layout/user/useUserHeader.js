import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "@/api/auth";
import { toast } from "@/lib/utils";
import { getPublicCategories } from "@/api/adminCategories";
import useWishlistStore from "@/stores/wishlistStore";
import useCartStore from "@/stores/cartStore";
import { 
  onCategoryCreated, 
  onCategoryUpdated, 
  onCategoryDeleted 
} from "@/utils/socket";

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
   * ===== SOCKET REAL-TIME: Tự động cập nhật danh mục khi admin thay đổi =====
   * Lắng nghe 3 events từ backend:
   * - category:created → Thêm danh mục mới
   * - category:updated → Cập nhật danh mục
   * - category:deleted → Xóa danh mục
   */
  useEffect(() => {
    // Lắng nghe khi có danh mục mới được tạo
    const unsubscribeCreated = onCategoryCreated((newCategory) => {
      // Chỉ thêm danh mục mới nếu isActive = true (công khai)
      // VÀ chưa tồn tại trong danh sách (kiểm tra theo id để tránh duplicate)
      if (newCategory.isActive) {
        setCategories((prev) => {
          // Kiểm tra xem danh mục đã tồn tại chưa (dựa trên id)
          const exists = prev.some((cat) => cat.id === newCategory.id);
          if (exists) {
            // Nếu đã tồn tại → Cập nhật thay vì thêm mới
            return prev.map((cat) =>
              cat.id === newCategory.id ? { ...cat, ...newCategory } : cat
            );
          }
          // Nếu chưa tồn tại → Thêm mới vào đầu danh sách
          return [newCategory, ...prev];
        });
      }
    });

    // Lắng nghe khi có danh mục được cập nhật
    const unsubscribeUpdated = onCategoryUpdated((updatedCategory) => {
      setCategories((prev) => {
        // Kiểm tra xem category có trong state không
        const exists = prev.some((cat) => cat.id === updatedCategory.id);
        
        if (exists) {
          // Nếu có → Cập nhật và filter
          return prev
            .map((cat) => (cat.id === updatedCategory.id ? { ...cat, ...updatedCategory } : cat))
            .filter((cat) => cat.isActive); // Loại bỏ nếu isActive = false
        } else {
          // Nếu không có trong state (đã bị filter trước đó)
          // VÀ isActive = true → Thêm lại vào
          if (updatedCategory.isActive) {
            return [updatedCategory, ...prev];
          }
          return prev; // Nếu isActive = false → Không thêm
        }
      });
    });

    // Lắng nghe khi có danh mục bị xóa
    const unsubscribeDeleted = onCategoryDeleted((data) => {
      setCategories((prev) => prev.filter((cat) => cat.id !== data.id));
    });

    // Cleanup: Ngừng lắng nghe khi component unmount
    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
    };
  }, []); // Chỉ chạy 1 lần khi mount

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
      } else {
        setUser(null); // Nếu không có user data → set null
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

