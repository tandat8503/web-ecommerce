import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { formatPrice } from '../../../../lib/utils';
import { useProductDetailContext } from '../ProductDetailContext';

/**
 * Component hiển thị danh sách sản phẩm nổi bật (sidebar bên phải)
 * - Lấy data từ Context, không cần nhận props
 * 
 * Chức năng:
 * - Hiển thị danh sách sản phẩm nổi bật dạng card nhỏ
 * - Mỗi card có: ảnh, tên, giá (có sale price nếu có), brand badge
 * - Click vào card sẽ navigate đến trang detail của sản phẩm đó
 * - Nếu không có sản phẩm, hiển thị thông báo "Chưa có sản phẩm nổi bật"
 */
const FeaturedProducts = () => {
  const navigate = useNavigate();
  
  // ============================================
  // LẤY DATA TỪ CONTEXT - Không cần nhận props
  // ============================================
  const { featuredProducts } = useProductDetailContext();

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-6">
          Top Sản Phẩm Nổi Bật
        </h3>
        
        <div className="space-y-4">
          {/* Kiểm tra nếu có sản phẩm nổi bật */}
          {featuredProducts.length > 0 ? (
            // Map qua từng sản phẩm và render card
            featuredProducts.map((featuredProduct) => (
              <Card
                key={featuredProduct.id}
                className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => navigate(`/san-pham/${featuredProduct.id}`)}
              >
                <CardContent className="p-0">
                  <div className="flex gap-3">
                    {/* Ảnh sản phẩm - 64x64px */}
                    <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 relative">
                      <img 
                        src={featuredProduct.imageUrl || 'https://via.placeholder.com/64x64?text=No+Image'} 
                        alt={featuredProduct.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Nếu ảnh lỗi, hiển thị placeholder
                          e.target.src = 'https://via.placeholder.com/64x64?text=No+Image';
                        }}
                      />
                      {/* 
                      Hiển thị Badge tên thương hiệu nếu có
                      - ?. = Optional chaining: Kiểm tra brand có tồn tại không
                      - Nếu brand tồn tại → lấy brand.name và ngược lại trả về undefined
                      && (Logical AND trong JSX)
                      - Nếu bên trái có giá trị → render Badge và ngược lại không render gì
                      */}
                      {featuredProduct.brand?.name && (
                        <Badge 
                          variant="secondary" 
                          className="absolute top-1 left-1 text-xs"
                        >
                          {featuredProduct.brand.name}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Thông tin sản phẩm: tên và giá */}
                    <div className="flex-1 min-w-0">
                      {/* Tên sản phẩm - tối đa 2 dòng */}
                      <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                        {featuredProduct.name}
                      </h4>
                      {/* Giá sản phẩm */}
                      <div className="text-red-600 font-semibold text-sm">
                        {/* Nếu có salePrice và khác price thì hiển thị cả 2 giá */}
                        {featuredProduct.salePrice && featuredProduct.salePrice !== featuredProduct.price ? (
                          <>
                            {/* Giá sale (màu đỏ) */}
                            {formatPrice(featuredProduct.salePrice)}
                            {/* Giá gốc (gạch ngang, màu xám) */}
                            <span className="text-xs text-gray-500 line-through ml-1">
                              {formatPrice(featuredProduct.price)}
                            </span>
                          </>
                        ) : (
                          // Nếu không có sale, chỉ hiển thị giá gốc
                          formatPrice(featuredProduct.price)
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            // Nếu không có sản phẩm nổi bật, hiển thị thông báo
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">Chưa có sản phẩm nổi bật</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FeaturedProducts;
