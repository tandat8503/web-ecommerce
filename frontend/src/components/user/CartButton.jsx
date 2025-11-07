import { useState } from "react";
import { FaShoppingCart, FaSpinner } from "react-icons/fa";
import useCartStore from "@/stores/cartStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * 🛒 CART BUTTON COMPONENT   VIẾT T3
 * 
 * Chức năng:
 * - Hiển thị số lượng giỏ hàng
 * - Thêm sản phẩm vào giỏ hàng
 * - Loading state khi đang thêm
 * - Toast notification
 * 
 * Props:
 * - productId: ID sản phẩm
 * - variantId: ID variant (optional)
 * - quantity: Số lượng (default: 1)
 * - size: Kích thước button (sm, md, lg)
 * - className: CSS class
 * - showBadge: Hiển thị badge số lượng (default: true)
 * - onAddToCart: Callback khi thêm thành công
 */

export default function CartButton({ 
  productId, 
  variantId = null, 
  quantity = 1, 
  size = "md", 
  className = "",  
  showBadge = true, 
  onAddToCart,
  disabled = false //disabled khi đang loading
}) {
  const { addToCart, loading } = useCartStore();//kết nối với store để lấy hàm addToCart và loading
  
  const cartCount = useCartStore((state) => state.totalQuantity); //số lượng sản phẩm trong giỏ hàng
  const [isAdding, setIsAdding] = useState(false); //trạng thái đang thêm vào giỏ hàng

  const handleAddToCart = async (e) => {
    e.preventDefault(); //ngăn chặn hành vi mặc định của button
    e.stopPropagation(); //ngăn chặn hành vi lan truyền của button
    
    if (isAdding || loading) return; //nếu đang thêm vào giỏ hàng hoặc đang loading thì không cho click
    
    try {
      setIsAdding(true); //set trạng thái đang thêm vào giỏ hàng
      
      // Gọi Zustand action để thêm vào giỏ hàng
      //gọi hàm addToCart với productId, variantId, quantity
      await addToCart({ 
        productId: Number(productId), 
        variantId: variantId ? Number(variantId) : null, 
        quantity: Number(quantity) 
      });
      
      // callback khi thêm thành công
      if (onAddToCart) {
        onAddToCart({ productId, variantId, quantity }); //gọi callback với productId, variantId, quantity
      }
      
    } catch (error) {
      console.error('Add to cart failed:', error);
      
    } finally {
      setIsAdding(false); //set trạng thái đang thêm vào giỏ hàng về false
    }
  };

  // Size variants
  const sizeClasses = {
    sm: "h-8 px-2 text-xs",//kích thước button sm
    md: "h-10 px-3 text-sm", //kích thước button md
    lg: "h-12 px-4 text-base"//kích thước button lg
  };

  const iconSizes = {
    sm: "w-3 h-3",//kích thước icon sm
    md: "w-4 h-4",//kích thước icon md
    lg: "w-5 h-5"//kích thước icon lg
  };

  return (
    <div className="relative">
      <Button
        onClick={handleAddToCart}
        disabled={isAdding || loading || disabled}
        className={`${sizeClasses[size]} ${className}`}
        variant="default"
      >
        {isAdding || loading ? (
          <FaSpinner className={`${iconSizes[size]} mr-2 animate-spin`} />
        ) : (
          <FaShoppingCart className={`${iconSizes[size]} mr-2`} />
        )}
        {isAdding || loading ? "Đang thêm..." : "Thêm vào giỏ"}
      </Button>
      
      {/* Badge hiển thị số lượng giỏ hàng */}
      {showBadge && cartCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs font-bold"
        >
          {cartCount > 99 ? "99+" : cartCount}
        </Badge>
      )}
    </div>
  );
}

/**
 * 🛒 CART ICON BUTTON (Chỉ icon, dùng cho header)
 */
export function CartIconButton({ className = "" }) {
  const { loading } = useCartStore();//kết nối với store để lấy hàm loading
  const cartCount = useCartStore((state) => state.totalQuantity);//số lượng sản phẩm trong giỏ hàng

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className={`h-10 w-10 ${className}`}
        disabled={loading}
      >
        <FaShoppingCart className="h-5 w-5" />
      </Button>
      
      {/* Badge số lượng */}
      {cartCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs font-bold"
        >
          {cartCount > 99 ? "99+" : cartCount}
        </Badge>
      )}
    </div>
  );
}
