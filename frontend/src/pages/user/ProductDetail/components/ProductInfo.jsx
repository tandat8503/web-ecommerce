import React from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import WishlistButton from '../../../../components/user/WishlistButton';
import CartButton from '../../../../components/user/CartButton';
import { formatPrice } from '../../../../lib/utils';
import { useProductDetailContext } from '../ProductDetailContext';
import VariantSelector from './VariantSelector';

/**
 * Component hiển thị thông tin sản phẩm và các nút hành động
 * - Tên sản phẩm, thương hiệu
 * - Giá (có thể có giá sale)
 * - Trạng thái tồn kho
 * - Chọn màu sắc và kích thước (nếu có variants)
 * - Chọn số lượng
 * - Nút thêm vào giỏ hàng và mua ngay
 * - Lấy data từ Context, không cần nhận props
 */
const ProductInfo = () => {
  const { id: productId } = useParams(); // Lấy ID sản phẩm từ URL
  
  // ============================================
  // LẤY DATA TỪ CONTEXT - Không cần nhận props
  // ============================================
  const {
    product,              // Sản phẩm
    variants,             // Danh sách variants
    selectedVariant,      // Variant đã chọn
    quantity,             // Số lượng đã chọn
    displayStock,         // Số lượng tồn kho hiển thị
    isInStock,            // Trạng thái còn hàng
    isLowStock,           // Trạng thái sắp hết hàng
    handleQuantityChange, // Hàm xử lý thay đổi số lượng
    handleBuyNow          // Hàm xử lý mua ngay
  } = useProductDetailContext();

  return (
    <div className="lg:col-span-6 space-y-6">
      {/* ============================================
          PHẦN 1: TÊN SẢN PHẨM VÀ THƯƠNG HIỆU
          ============================================ */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Tên sản phẩm - hiển thị lớn và đậm */}
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">{product.name}</h1>
          {/* Thương hiệu - hiển thị nhỏ hơn, màu xám */}
          <p className="text-lg sm:text-xl text-muted-foreground">
            Thương hiệu: {product.brand?.name || 'N/A'}
          </p>
        </div>
        {/* Nút yêu thích - icon trái tim ở góc phải */}
        <WishlistButton 
          productId={Number(productId)}
          size="lg"
          className="mt-1 cursor-pointer"
        />
      </div>

      {/* ============================================
          PHẦN 2: GIÁ SẢN PHẨM
          ============================================ */}
      <div className="space-y-2">
        {/* Nếu có giá sale (giá khuyến mãi) */}
        {product.salePrice && product.salePrice !== product.price ? (
          <>
            {/* Hiển thị giá sale - màu đỏ, chữ lớn */}
            <div className="text-3xl sm:text-4xl font-bold text-red-600">
              {formatPrice(product.salePrice)}
            </div>
            <div className="flex items-center gap-2">
              {/* Giá gốc - gạch ngang, màu xám */}
              <span className="text-xl text-muted-foreground line-through">
                {formatPrice(product.price)}
              </span>
              {/* Badge hiển thị % giảm giá */}
              <Badge variant="destructive">
                -{((product.price - product.salePrice) / product.price * 100).toFixed(0)}%
              </Badge>
            </div>
          </>
        ) : (
          /* Nếu không có sale - chỉ hiển thị giá gốc */
          <div className="text-3xl sm:text-4xl font-bold text-red-600">
            {formatPrice(product.price)}
          </div>
        )}
      </div>

      {/* ============================================
          PHẦN 3: TRẠNG THÁI TỒN KHO
          ============================================ */}
      <Badge 
        variant={!isInStock ? "destructive" : "outline"}
        className={`text-sm ${
          !isInStock 
            ? '' // Hết hàng - màu đỏ mặc định
            : isLowStock 
            ? 'border-orange-500 text-orange-700 bg-orange-50' // Sắp hết - màu cam
            : 'border-green-500 text-green-700 bg-green-50' // Còn hàng - màu xanh
        }`}
      >
        {/* Chấm tròn màu để hiển thị trạng thái */}
        <span className={`w-2 h-2 rounded-full inline-block mr-2 ${
          !isInStock ? 'bg-red-500' : isLowStock ? 'bg-orange-500' : 'bg-green-500'
        }`}></span>
        {/* Text hiển thị số lượng tồn kho */}
        {!isInStock 
          ? 'Hết hàng' 
          : isLowStock 
          ? `Sắp hết: ${displayStock} sản phẩm` 
          : `Còn lại: ${displayStock} sản phẩm`
        }
      </Badge>

      {/* ============================================
          PHẦN 4: CHỌN MÀU SẮC VÀ KÍCH THƯỚC
          ============================================ */}
      {/* Chỉ hiển thị khi sản phẩm có variants (màu sắc/kích thước) */}
      {variants.length > 0 && <VariantSelector />}

      {/* ============================================
          PHẦN 5: CHỌN SỐ LƯỢNG VÀ NÚT HÀNH ĐỘNG
          ============================================ */}
      <div className="space-y-4">
        {/* Chọn số lượng */}
        <div className="flex items-center gap-4">
          <span className="font-medium">Số lượng:</span>
          <div className="flex items-center gap-2">
            {/* Nút giảm số lượng */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={quantity <= 1} // Disable khi số lượng = 1
              className="cursor-pointer"
            >
              -
            </Button>
            {/* Hiển thị số lượng hiện tại */}
            <span className="w-12 text-center font-medium">{quantity}</span>
            {/* Nút tăng số lượng */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleQuantityChange(quantity + 1)}
              disabled={quantity >= displayStock} // Disable khi đạt số lượng tối đa
              className="cursor-pointer"
            >
              +
            </Button>
          </div>
        </div>

        {/* Nút thêm vào giỏ hàng và mua ngay */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Nút thêm vào giỏ hàng */}
          <CartButton
            productId={Number(productId)}
            variantId={selectedVariant?.id ? Number(selectedVariant.id) : null} // ID variant nếu đã chọn
            quantity={quantity}
            size="md"
            disabled={!isInStock || (variants.length > 0 && !selectedVariant)} // Disable khi hết hàng hoặc chưa chọn variant
            showBadge={false}
            className="bg-black hover:bg-gray-800 text-white h-10 px-4 text-sm w-full cursor-pointer"
          />
          {/* Nút mua ngay */}
          <Button
            onClick={handleBuyNow}
            disabled={!isInStock || (variants.length > 0 && !selectedVariant)} // Disable khi hết hàng hoặc chưa chọn variant
            className="bg-black hover:bg-gray-800 text-white h-10 px-4 text-sm w-full cursor-pointer"
          >
            Mua ngay
          </Button>
        </div>
        
        {/* ============================================
            PHẦN 6: THÔNG BÁO CẢNH BÁO
            ============================================ */}
        {/* Cảnh báo khi chưa chọn màu sắc/kích thước */}
        {variants.length > 0 && !selectedVariant && isInStock && (
          <Badge variant="outline" className="w-full justify-center bg-orange-50 text-orange-700 border-orange-300">
             Vui lòng chọn màu sắc và kích thước trước khi thêm vào giỏ hàng
          </Badge>
        )}
        {/* Cảnh báo khi hết hàng */}
        {!isInStock && (
          <Badge variant="destructive" className="w-full justify-center">
             Sản phẩm đã hết hàng. Vui lòng chọn sản phẩm khác.
          </Badge>
        )}
      </div>
    </div>
  );
};

export default ProductInfo;
