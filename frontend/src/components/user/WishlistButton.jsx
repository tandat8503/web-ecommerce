import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import useWishlistStore from "@/stores/wishlistStore";

/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║       📝 FILE #7 - VIẾT THỨ 7 (WISHLIST BUTTON - REUSABLE COMPONENT)     ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 
 */
export default function WishlistButton({ 
  productId, //id của sản phẩm
  size = "md", //size của button
  className = "",//class của button
  showTooltip = true,//hiển thị tooltip
  onToggle //callback function
}) {
  // ========== ROUTER HOOK ==========
  const navigate = useNavigate();
  
  // ========== ZUSTAND HOOKS ==========
  const { toggleWishlist, loading } = useWishlistStore();
  // ✅ Subscribe vào store để trigger re-render khi state thay đổi
  const wishlistItems = useWishlistStore((state) => state.items);
  const isInWishlistProduct = wishlistItems.some(item => item.productId === productId);
  
  // Debug logs
  console.log('❤️ WishlistButton - wishlistItems.length:', wishlistItems.length);
  console.log('❤️ WishlistButton - isInWishlistProduct:', isInWishlistProduct);
  
  // ========== LOCAL STATE ==========
  const [isToggling, setIsToggling] = useState(false);//check toggle

  // ========== HANDLE CLICK ==========
  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation(); 

    // Nếu đang loading thì không cho click
    if (isToggling || loading) return;

    // Kiểm tra đăng nhập: Nếu chưa có token thì redirect đến trang auth
    const token = localStorage.getItem('token');
    if (!token) {
      //redirect=encodeURIComponent(window.location.pathname) là để lưu lại url hiện tại để sau khi đăng nhập thì redirect về url đó
      navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    try {
      setIsToggling(true);
      
      // Gọi Zustand action để toggle wishlist
      await toggleWishlist(productId);
      
      // Callback sau khi toggle
      if (onToggle) {
        onToggle();
      }
    } catch (error) {
      // Error đã được handle trong store (toast)
      console.error('Toggle wishlist failed:', error);
    } finally {
      setIsToggling(false);
    }
  };

  // ========== ICON SIZE ==========
  const iconSize = {
    sm: "text-base",      // 16px
    md: "text-xl",        // 20px
    lg: "text-2xl"        // 24px
  };

  // ========== BUTTON SIZE ==========
  const buttonSize = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12"
  };

  return (
    <button
      onClick={handleClick}
      disabled={isToggling || loading}
      className={`
        ${buttonSize[size]}
        flex items-center justify-center
        rounded-full
        bg-white/90 backdrop-blur-sm
        hover:bg-white
        transition-all duration-200
        shadow-md hover:shadow-lg
        disabled:opacity-50 disabled:cursor-not-allowed
        group
        cursor-pointer
        ${className}
      `}
      title={showTooltip ? (isInWishlistProduct ? "Xóa khỏi yêu thích" : "Thêm vào yêu thích") : ""}
    >
      {/* Icon */}
      {isInWishlistProduct ? (
        <FaHeart 
          className={`${iconSize[size]} text-red-500 transition-transform group-hover:scale-110`} 
        />
      ) : (
        <FaRegHeart 
          className={`${iconSize[size]} text-gray-600 group-hover:text-red-500 transition-all group-hover:scale-110`} 
        />
      )}
      
      {/* Loading spinner (nếu đang toggle) */}
      {isToggling && (
        <span className="absolute">
          <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </span>
      )}
    </button>
  );
}

/**
 * ========================================
 * WISHLIST TEXT BUTTON (Variant)
 * ========================================
 * 
 * Button dạng text với border
 * Dùng cho ProductDetail page hoặc nơi cần button to hơn
 */
export function WishlistTextButton({ productId, className = "" }) {
  const navigate = useNavigate();
  const { toggleWishlist, loading } = useWishlistStore();
  // ✅ Subscribe vào store để trigger re-render khi state thay đổi
  const wishlistItems = useWishlistStore((state) => state.items);
  const isInWishlistProduct = wishlistItems.some(item => item.productId === productId);
  const [isToggling, setIsToggling] = useState(false);
  
  // Debug logs
  console.log('❤️ WishlistTextButton - wishlistItems.length:', wishlistItems.length);
  console.log('❤️ WishlistTextButton - isInWishlistProduct:', isInWishlistProduct);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isToggling || loading) return;

    // Kiểm tra đăng nhập: Nếu chưa có token thì redirect đến trang auth
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    try {
      setIsToggling(true);
      
      // Toggle wishlist
      await toggleWishlist(productId);
    } catch (error) {
      console.error('Toggle wishlist failed:', error);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isToggling || loading}
      className={`
        flex items-center gap-2 px-4 py-2
        rounded-lg border
        ${isInWishlistProduct 
          ? 'border-red-500 text-red-500 bg-red-50' 
          : 'border-gray-300 text-gray-700 hover:border-red-500 hover:text-red-500'
        }
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {isInWishlistProduct ? <FaHeart /> : <FaRegHeart />}
      <span className="text-sm font-medium">
        {isInWishlistProduct ? "Đã yêu thích" : "Yêu thích"}
      </span>
    </button>
  );
}
