import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import useWishlistStore from "@/stores/wishlistStore";

/**
 * ========================================
 * WISHLIST BUTTON - NÚT YÊU THÍCH ✨
 * =======================================
 * 
 * Component button để thêm/xóa sản phẩm khỏi wishlist
 * Sử dụng shadcn/ui Button component
 */
export default function WishlistButton({ 
  productId,
  size = "md",
  className = "",
  showTooltip = true,//hiển thị tooltip
  onToggle //callback khi thêm/xóa sản phẩm khỏi wishlist
}) {
  const navigate = useNavigate();
  
  // ========== ZUSTAND HOOKS ==========
  const { toggleWishlist, loading } = useWishlistStore();
  const wishlistItems = useWishlistStore((state) => state.items);
  const isInWishlistProduct = wishlistItems.some(item => item.productId === productId);
  
  // ========== LOCAL STATE ==========
  const [isToggling, setIsToggling] = useState(false);//trạng thái loading

  // ========== HANDLE CLICK ==========
  const handleClick = async (e) => {//xử lý click
    e.preventDefault();//không reload trang
    e.stopPropagation(); 

    if (isToggling || loading) return;

    // Kiểm tra đăng nhập, nếu không đăng nhập thì chuyển hướng đến trang đăng nhập
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    try {
      setIsToggling(true);//set loading
      await toggleWishlist(productId);//thêm/xóa sản phẩm khỏi wishlist
      
      if (onToggle) {
        onToggle();//callback khi thêm/xóa sản phẩm khỏi wishlist
      }
    } catch (error) {
      console.error('Toggle wishlist failed:', error);
    } finally {
      setIsToggling(false);//tắt loading
    }
  };

  
  //kích thước button
  const buttonSizeMap = {
    sm: "icon",
    md: "icon",
    lg: "icon"
  };

  
  //kích thước icon
  const iconSizeMap = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl"
  };

  return (
    <Button
      variant="ghost"
      size={buttonSizeMap[size]}//kích thước button
      onClick={handleClick}//xử lý click
      disabled={isToggling || loading}//trạng thái loading
      className={`rounded-full ${className}`}//class name
      title={showTooltip ? (isInWishlistProduct ? "Xóa khỏi yêu thích" : "Thêm vào yêu thích") : ""}
    >
      {isInWishlistProduct ? (
        <FaHeart className={`${iconSizeMap[size]} text-red-500`} />
      ) : (
        <FaRegHeart className={`${iconSizeMap[size]} text-gray-600`} />
      )}
    </Button>
  );
}

/**
 * ========================================
 * WISHLIST TEXT BUTTON (Variant)
 * =======================================
 * 
 * Button dạng text với border nút này hiển thị trong trang detail sản phẩm
 * Dùng cho ProductDetail page hoặc nơi cần button to hơn 
 */
export function WishlistTextButton({ productId, className = "" }) {
  const navigate = useNavigate();
  const { toggleWishlist, loading } = useWishlistStore();//store wishlist
  const wishlistItems = useWishlistStore((state) => state.items);//lấy danh sách sản phẩm trong wishlist
  const isInWishlistProduct = wishlistItems.some(item => item.productId === productId);//kiểm tra sản phẩm có trong wishlist không
  const [isToggling, setIsToggling] = useState(false);//trạng thái loading

  const handleClick = async (e) => {//xử lý click
    e.preventDefault();
    e.stopPropagation();
    
    if (isToggling || loading) return;

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    try {
      setIsToggling(true);
      await toggleWishlist(productId);
    } catch (error) {
      console.error('Toggle wishlist failed:', error);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <Button
      variant={isInWishlistProduct ? "outline" : "outline"}
      onClick={handleClick}
      disabled={isToggling || loading}
      className={`${isInWishlistProduct ? 'border-red-500 text-red-500 hover:bg-red-50' : 'border-gray-300 text-gray-700 hover:border-red-500 hover:text-red-500'} ${className}`}
    >
      {isInWishlistProduct ? <FaHeart className="mr-2" /> : <FaRegHeart className="mr-2" />}
      <span className="text-sm font-medium">
        {isInWishlistProduct ? "Đã yêu thích" : "Yêu thích"}
      </span>
    </Button>
  );
}
