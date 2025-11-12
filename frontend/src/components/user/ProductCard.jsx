import React from "react";
import { FaEye, FaFire } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import WishlistButton from "./WishlistButton";
import { formatPrice } from "@/lib/utils";

const ProductCard = ({
  product,
  showActions = true,//hiển thị nút yêu thích và xem nhanh
  showBrand = true,//hiển thị thương hiệu
  showStock = true,//hiển thị tồn kho
  className = "",
}) => {
  const navigate = useNavigate();
  
  // =======================
  // LOGIC
  // =======================
  // Kiểm tra sản phẩm mới (tạo trong 30 ngày gần đây)
  const isNew = new Date(product.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  // Kiểm tra sản phẩm đang sale (có giá sale và giá sale < giá gốc)
  const isOnSale = product.salePrice && parseFloat(product.salePrice) < parseFloat(product.price);
  
  // Giá hiển thị: ưu tiên giá sale nếu có, không thì dùng giá gốc
  const displayPrice = isOnSale ? product.salePrice : product.price;
  
  // Tính phần trăm giảm giá (làm tròn)
  const discountPercent = isOnSale ? Math.round(((product.price - product.salePrice) / product.price) * 100) : 0;
  
  // Lấy stockQuantity (backend đã tính tổng từ variants)
  // Nếu không có, tính từ variants nếu có, hoặc mặc định 0
  const stockQuantity = product.stockQuantity ?? 
    (product.variants?.reduce((sum, v) => sum + (v.stockQuantity || 0), 0) || 0);
  
  // Kiểm tra còn hàng (số lượng > 0)
  const isInStock = stockQuantity > 0;
  
  // Kiểm tra sắp hết hàng (còn hàng nhưng < 5 sản phẩm)
  const isLowStock = stockQuantity > 0 && stockQuantity < 5;
  
  // URL ảnh mặc định nếu không có ảnh
  const imageUrl = product.imageUrl || product.images?.[0]?.imageUrl || "https://images.unsplash.com/photo-1586023492125-27b2c04ef357?w=800&h=800&fit=crop";

  /**
   * Xử lý khi click icon con mắt (Quick View)
   * Chuyển đến trang chi tiết sản phẩm
   */
  const handleQuickView = () => navigate(`/san-pham/${product.id}`);

  // Helper functions để tạo badge cho số lượng sản phẩm
  const badgeBase = "font-bold text-sm px-3 py-1.5 shadow-lg rounded-full";//cơ sở để tạo badge
  //style cho badge tồn kho
  const stockStyle = !isInStock ? "bg-red-100 text-red-700 border-red-200" : isLowStock ? "bg-orange-100 text-orange-700 border-orange-200" : "bg-green-100 text-green-700 border-green-200";
  //text cho badge tồn kho
  const stockText = !isInStock ? "Hết hàng" : isLowStock ? `Sắp hết (${stockQuantity})` : `Còn ${stockQuantity} sản phẩm`;

  // =======================
  // RENDER
  // =======================
  return (
    <Card
      className={`group w-[280px] sm:w-[320px] md:w-[360px] bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xl hover:-translate-y-4 transition-all duration-500 ${className}`}
      style={{ margin: 0, padding: 0, boxShadow: '0 15px 35px rgba(0,0,0,0.1), 0 5px 15px rgba(0,0,0,0.08)' }}
      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 25px 50px rgba(239, 68, 68, 0.3), 0 10px 30px rgba(239, 68, 68, 0.2), 0 0 0 1px rgba(239, 68, 68, 0.15)'}
      onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,0.1), 0 5px 15px rgba(0,0,0,0.08)'}
    >
      {/* Ảnh sản phẩm */}
      <div 
        className="relative w-full h-[320px] sm:h-[360px] overflow-hidden bg-gray-100 cursor-pointer" 
        style={{ margin: 0, padding: 0, lineHeight: 0, fontSize: 0 }}
        onClick={handleQuickView}
        title="Xem chi tiết sản phẩm"
      >
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
          style={{ margin: 0, padding: 0, display: 'block', verticalAlign: 'top', lineHeight: 0, border: 'none', outline: 'none', fontSize: 0 }}
        />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Badges trên hình ảnh */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          {isNew && <Badge className={`${badgeBase} bg-gradient-to-r from-green-500 to-green-600 text-white flex items-center gap-1.5`}><FaFire className="h-3 w-3" /> MỚI</Badge>}
          {isOnSale && <Badge className={`${badgeBase} bg-gradient-to-r from-red-500 to-red-600 text-white`}>-{discountPercent}%</Badge>}
          {product.isFeatured && <Badge className={`${badgeBase} bg-gradient-to-r from-yellow-500 to-orange-500 text-white`}>NỔI BẬT</Badge>}
        </div>

        {/* Action Buttons nút yêu thích và xem nhanh */}
        {showActions && (
          <div className="absolute right-3 top-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
            <WishlistButton productId={product.id} size="md" className="shadow-lg cursor-pointer" />
            <Button size="icon" className="bg-white/95 hover:bg-white shadow-lg rounded-full h-10 w-10 cursor-pointer" onClick={handleQuickView} title="Xem chi tiết sản phẩm">
              <FaEye className="text-gray-600 hover:text-blue-500" />
            </Button>
          </div>
        )}
      </div>

      {/* Nội dung */}
      <CardContent className="p-4 flex flex-col gap-2.5">
        {/* Tên sản phẩm */}
        <Link to={`/san-pham/${product.id}`} className="line-clamp-2 text-[16px] sm:text-[18px] font-semibold text-gray-800 hover:text-primary transition-colors duration-200">
          {product.name}
        </Link>

        {/* Giá */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[20px] sm:text-[22px] font-bold text-red-500">{formatPrice(displayPrice)}</span>
            {isOnSale && <Badge className="bg-red-100 text-red-700 border-red-200 px-2 py-1 text-xs font-semibold">-{discountPercent}%</Badge>}
          </div>
          {isOnSale && <span className="text-gray-400 text-sm line-through">{formatPrice(product.price)}</span>}
        </div>

        {/* tên thương hiệu và tồn kho */}
        <div className="flex items-center justify-between gap-2">
          {showStock && <Badge className={`px-3 py-1 text-xs font-semibold ${stockStyle}`}>{stockText}</Badge>}
          {showBrand && product.brand?.name && <Badge className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 border-blue-200">{product.brand.name}</Badge>}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
