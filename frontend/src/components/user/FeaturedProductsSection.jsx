import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FaStar } from "react-icons/fa";
import ProductCard from "./ProductCard";
import { getPublicProducts } from "../../api/adminProducts";
import { 
  onProductCreated, 
  onProductUpdated, 
  onProductDeleted 
} from "../../utils/socket";

/**
 * FeaturedProductsSection Component - Section sản phẩm nổi bật cho trang chủ
 * 
 * MỤC ĐÍCH:
 * - Hiển thị sản phẩm nổi bật trên trang chủ
 * - Tái sử dụng ProductCard đã có
 * - Layout compact phù hợp với trang chủ
 * 
 * @param {Object} props - Props của component
 * @param {number} [props.limit=6] - Số lượng sản phẩm hiển thị
 * @param {boolean} [props.showActions=true] - Hiển thị các nút yêu thích và xem chi tiết
 * @param {string} [props.className=""] - CSS class tùy chỉnh
 * 
 * @returns {JSX.Element} Component FeaturedProductsSection
 */
const FeaturedProductsSection = ({ 
  limit = 9,
  showActions = true,
  className = ""
}) => {
  // ================================
  // STATE MANAGEMENT
  // ================================
  
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ================================
  // EFFECTS
  // ================================
  
  useEffect(() => {
    fetchFeaturedProducts();
  }, [limit]);

  // Socket real-time: Cập nhật products khi admin CRUD
  useEffect(() => {
    // Sản phẩm mới → Thêm nếu isFeatured = true và ACTIVE
    const unsubscribeCreated = onProductCreated((newProduct) => {
      if (newProduct.isFeatured && newProduct.status === 'ACTIVE') {
        setFeaturedProducts(prev => {
          const exists = prev.some(p => p.id === newProduct.id);
          if (exists) {
            return prev.map(p => p.id === newProduct.id ? newProduct : p);
          }
          // Giữ limit, bỏ sản phẩm cuối nếu đã đủ
          const newList = [newProduct, ...prev];
          return newList.slice(0, limit);
        });
      }
    });

    // Sản phẩm cập nhật → Cập nhật hoặc xóa
    const unsubscribeUpdated = onProductUpdated((updatedProduct) => {
      console.log('🔄 Socket: Featured product updated', updatedProduct);
      // Chỉ hiển thị nếu isFeatured = true và status = 'ACTIVE'
      const shouldShow = updatedProduct.isFeatured && updatedProduct.status === 'ACTIVE';
      
      setFeaturedProducts(prev => {
        const exists = prev.some(p => p.id === updatedProduct.id);
        if (exists) {
          if (shouldShow) {
            // Cập nhật product (merge để giữ lại variants nếu có)
            console.log('✅ Featured product vẫn ACTIVE, cập nhật:', updatedProduct.id, 'stockQuantity:', updatedProduct.stockQuantity);
            return prev.map(p => {
              if (p.id === updatedProduct.id) {
                // Merge với product cũ để giữ lại variants nếu socket không gửi
                return { ...p, ...updatedProduct };
              }
              return p;
            });
          } else {
            // Xóa product nếu bị tắt (INACTIVE/OUT_OF_STOCK) hoặc không còn featured
            console.log('❌ Featured product bị tắt (status:', updatedProduct.status, ') hoặc không còn featured, xóa khỏi danh sách:', updatedProduct.id);
            return prev.filter(p => p.id !== updatedProduct.id);
          }
        } else if (shouldShow) {
          // Thêm product mới nếu chưa có và ACTIVE + featured
          console.log('✅ Featured product mới ACTIVE, thêm vào danh sách:', updatedProduct.id, 'stockQuantity:', updatedProduct.stockQuantity);
          const newList = [updatedProduct, ...prev];
          return newList.slice(0, limit);
        }
        return prev;
      });
    });

    // Sản phẩm xóa → Xóa khỏi danh sách
    const unsubscribeDeleted = onProductDeleted((data) => {
      setFeaturedProducts(prev => prev.filter(p => p.id !== data.id));
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
    };
  }, [limit]);

  // ================================
  // API FUNCTIONS
  // ================================
  
  const fetchFeaturedProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("⭐ Bắt đầu tải sản phẩm nổi bật cho trang chủ...");
      
      // Backend tự động sắp xếp theo createdAt desc (mới nhất trước)
      // và filter isFeatured: true để lấy sản phẩm nổi bật
      const response = await getPublicProducts({
        page: 1,
        limit: limit,
        isFeatured: true
      });
      
      console.log("⭐ Response sản phẩm nổi bật:", response);
      
      // Backend trả về đúng số lượng cần thiết
      const products = response.data?.items || [];
      
      console.log(`⭐ Đã tải ${products.length} sản phẩm nổi bật cho trang chủ`);
      setFeaturedProducts(products);
      
    } catch (err) {
      console.error("❌ Lỗi tải sản phẩm nổi bật:", err);
      setError(`Lỗi tải dữ liệu: ${err.message || 'Không xác định'}`);
    } finally {
      setLoading(false);
    }
  };

  // Debug log
  console.log("⭐ FeaturedProductsSection render - Số sản phẩm:", featuredProducts.length, "Loading:", loading, "Error:", error);
  
  // ================================
  // RENDER UI
  // ================================
  
  if (loading) {
    return (
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-gray-600">Đang tải sản phẩm nổi bật...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16">
        <div className="text-center">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-8">
              <FaStar className="text-6xl text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Không thể tải sản phẩm nổi bật
              </h2>
              <p className="text-gray-600 text-lg mb-6">
                Có lỗi xảy ra khi tải dữ liệu sản phẩm. Vui lòng thử lại sau.
              </p>
              <Button 
                onClick={() => {
                  setError(null);
                  fetchFeaturedProducts();
                }}
                className="px-8 py-3"
              >
                Thử lại
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`py-16 bg-white ${className}`}>
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block">
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-4">
              SẢN PHẨM NỔI BẬT
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 mx-auto rounded-full mb-4"></div>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
              Những sản phẩm được yêu thích nhất từ bộ sưu tập nội thất cao cấp
            </p>
          </div>
        </div>
        
        {/* Sản phẩm nổi bật */}
        {featuredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Card className="max-w-md mx-auto">
              <CardContent className="py-6">
                <FaStar className="text-4xl text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-500 mb-2">Chưa có sản phẩm nổi bật</h3>
                <p className="text-gray-400">Hiện tại chưa có sản phẩm nào được đánh dấu là nổi bật</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard 
                key={product.id}
                product={product} 
                showActions={showActions}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeaturedProductsSection;
