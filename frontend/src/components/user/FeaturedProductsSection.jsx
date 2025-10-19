import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FaStar, FaCrown } from "react-icons/fa";
import ProductCard from "./ProductCard";
import { getProductsByCategory } from "../../api/adminProducts";
import { getPublicCategories } from "../../api/adminCategories";

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
 * @param {boolean} [props.showActions=true] - Hiển thị các nút action
 * @param {Function} [props.onAddToCart] - Callback khi click "Thêm vào giỏ"
 * @param {Function} [props.onAddToWishlist] - Callback khi click "Yêu thích"
 * @param {Function} [props.onQuickView] - Callback khi click "Xem nhanh"
 * @param {string} [props.className=""] - CSS class tùy chỉnh
 * 
 * @returns {JSX.Element} Component FeaturedProductsSection
 */
const FeaturedProductsSection = ({ 
  limit = 6,
  showActions = true,
  onAddToCart,
  onAddToWishlist,
  onQuickView,
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

  // ================================
  // API FUNCTIONS
  // ================================
  
  const fetchFeaturedProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("⭐ Bắt đầu tải sản phẩm nổi bật cho trang chủ...");
      
      // Lấy tất cả sản phẩm từ các danh mục
      const allProducts = [];
      
      // Lấy danh mục trước
      const categoriesResponse = await getPublicCategories();
      const categories = categoriesResponse.data?.items || categoriesResponse.data || [];
      
      // Lấy sản phẩm từ mỗi danh mục
      for (const category of categories) {
        try {
          const productsResponse = await getProductsByCategory(category.id, {
            page: 1,
            limit: 10, // Lấy ít hơn vì chỉ cần cho trang chủ
            sortBy: 'createdAt',
            sortOrder: 'desc'
          });
          
          if (productsResponse.data?.success) {
            const products = productsResponse.data.data.products || [];
            allProducts.push(...products);
          }
        } catch (err) {
          console.error(`❌ Lỗi tải sản phẩm cho danh mục ${category.name}:`, err);
        }
      }
      
      // Lọc sản phẩm nổi bật (isFeatured = true)
      const featured = allProducts
        .filter(product => product.isFeatured === true)
        .slice(0, limit);
      
      console.log(`⭐ Đã tải ${featured.length} sản phẩm nổi bật cho trang chủ`);
      setFeaturedProducts(featured);
      
    } catch (err) {
      console.error("❌ Lỗi tải sản phẩm nổi bật:", err);
      setError(`Lỗi tải dữ liệu: ${err.message || 'Không xác định'}`);
    } finally {
      setLoading(false);
    }
  };

  // ================================
  // HELPER FUNCTIONS
  // ================================
  
  // Default callbacks cho ProductCard
  const defaultCallbacks = {
    onAddToCart: (product) => console.log('🛒 Thêm vào giỏ:', product.name),
    onAddToWishlist: (product) => console.log('❤️ Thêm vào yêu thích:', product.name),
    onQuickView: (product) => console.log('👁️ Xem nhanh:', product.name)
  };

  // ================================
  // LOADING & ERROR STATES
  // ================================
  
  if (loading) {
    return (
      <div className="py-16">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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

  // ================================
  // RENDER COMPONENTS
  // ================================
  
  const renderHeader = () => (
    <div className="text-center mb-12">
      <div className="inline-block">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full text-white shadow-lg">
            <FaCrown className="text-xl" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
            SẢN PHẨM NỔI BẬT
          </h2>
        </div>
        <div className="w-24 h-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 mx-auto rounded-full mb-4"></div>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
          Những sản phẩm được yêu thích nhất từ bộ sưu tập nội thất cao cấp
        </p>
      </div>
    </div>
  );

  const renderProducts = () => {
    if (featuredProducts.length === 0) {
      return (
        <div className="text-center py-12">
          <Card className="max-w-md mx-auto">
            <CardContent className="py-6">
              <FaStar className="text-4xl text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-500 mb-2">Chưa có sản phẩm nổi bật</h3>
              <p className="text-gray-400">Hiện tại chưa có sản phẩm nào được đánh dấu là nổi bật</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div 
        className="grid gap-6"
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '1.5rem',
          gridAutoRows: 'auto'
        }}
      >
        {featuredProducts.map((product) => (
          <ProductCard 
            key={product.id}
            product={product} 
            showActions={showActions}
            onAddToCart={onAddToCart || defaultCallbacks.onAddToCart}
            onAddToWishlist={onAddToWishlist || defaultCallbacks.onAddToWishlist}
            onQuickView={onQuickView || defaultCallbacks.onQuickView}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={`py-16 bg-white ${className}`}>
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        {renderHeader()}
        
        {/* Sản phẩm nổi bật */}
        {renderProducts()}
      </div>
    </div>
  );
};

export default FeaturedProductsSection;
