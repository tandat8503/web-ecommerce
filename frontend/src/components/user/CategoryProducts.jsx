import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FaBox } from "react-icons/fa";
import ProductCard from "./ProductCard";
import { getProductsByCategory } from "../../api/adminProducts";
import { getPublicCategories } from "../../api/adminCategories";

// CSS Animation cho hiệu ứng shimmer và cầu vòng
const shimmerStyle = `
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
  
  @keyframes rainbow-shimmer {
    0% {
      background-position: -500% 0;
    }
    100% {
      background-position: 500% 0;
    }
  }
  
  @keyframes wood-shimmer {
    0% {
      background-position: -300% 0;
    }
    100% {
      background-position: 300% 0;
    }
  }
  
  @keyframes diamond-shine {
    0%, 100% {
      transform: translateX(-100%) rotate(45deg);
      opacity: 0;
    }
    50% {
      transform: translateX(100%) rotate(45deg);
      opacity: 1;
    }
  }
  
  @keyframes wave-shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
  
  @keyframes spotlight {
    0% {
      background: 'radial-gradient(circle at 0% 50%, rgba(255,255,255,0.8) 0%, transparent 50%)';
    }
    50% {
      background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.8) 0%, transparent 50%)';
    }
    100% {
      background: 'radial-gradient(circle at 100% 50%, rgba(255,255,255,0.8) 0%, transparent 50%)';
    }
  }
`;

// Thêm style vào head
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = shimmerStyle;
  document.head.appendChild(style);
}

/**
 * CategoryProducts Component - Hiển thị sản phẩm và danh mục với layout dọc
 * 
 * MỤC ĐÍCH:
 * - Hiển thị sản phẩm theo danh mục (không bao gồm sản phẩm nổi bật)
 * - Tránh trùng lặp với section "Sản phẩm nổi bật"
 * - Tích hợp với ProductCard để hiển thị sản phẩm
 * - Layout gọn gàng, sạch sẽ theo yêu cầu
 * 
 * @param {Object} props - Props của component
 * @param {string} [props.variant="default"] - Kiểu hiển thị ProductCard
 * @param {boolean} [props.showActions=true] - Hiển thị các nút action
 * @param {boolean} [props.showCategory=true] - Hiển thị tên danh mục
 * @param {boolean} [props.showBrand=true] - Hiển thị tên thương hiệu
 * @param {boolean} [props.showStock=true] - Hiển thị trạng thái tồn kho
 * @param {Function} [props.onAddToCart] - Callback khi click "Thêm vào giỏ"
 * @param {Function} [props.onAddToWishlist] - Callback khi click "Yêu thích"
 * @param {Function} [props.onQuickView] - Callback khi click "Xem nhanh"
 * @param {string} [props.className=""] - CSS class tùy chỉnh
 * 
 * @returns {JSX.Element} Component CategoryProducts
 */
const CategoryProducts = ({ 
  variant = "default", 
  showActions = true,
  showCategory = true,
  showBrand = true,
  showStock = true,
  onAddToCart,
  onAddToWishlist,
  onQuickView,
  className = ""
}) => {
  // ================================
  // STATE MANAGEMENT
  // ================================
  
  const [categories, setCategories] = useState([]);
  const [productsByCategory, setProductsByCategory] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ================================
  // EFFECTS
  // ================================
  
  useEffect(() => {
    fetchData();
  }, []);

  // ================================
  // API FUNCTIONS
  // ================================
  
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("🔄 Bắt đầu tải dữ liệu...");
      
      // Load danh mục
      console.log("📂 Đang tải danh mục...");
      const categoriesResponse = await getPublicCategories();
      console.log("📂 Response danh mục:", categoriesResponse);
      
      const categoriesData = categoriesResponse.data?.items || categoriesResponse.data || [];
      console.log("📂 Danh mục đã tải:", categoriesData);
      setCategories(categoriesData);
      
      if (categoriesData.length === 0) {
        console.log("⚠️ Không có danh mục nào");
        setProductsByCategory({});
        return;
      }
      
      // Load sản phẩm cho từng danh mục
      console.log("📦 Bắt đầu tải sản phẩm cho từng danh mục...");
      const productsData = {};
      
      for (const category of categoriesData) {
        try {
          console.log(`📦 Đang tải sản phẩm cho danh mục: ${category.name} (ID: ${category.id})`);
          
          const productsResponse = await getProductsByCategory(category.id, {
            page: 1,
            limit: 6,
            sortBy: 'createdAt',
            sortOrder: 'desc',
            excludeFeatured: true // Loại bỏ sản phẩm nổi bật
          });
          
          console.log(`📦 Response sản phẩm cho ${category.name}:`, productsResponse);
          
          if (productsResponse.data?.success) {
            // Lọc bỏ sản phẩm nổi bật để tránh trùng lặp
            const allProducts = productsResponse.data.data.products || [];
            const nonFeaturedProducts = allProducts.filter(product => !product.isFeatured);
            productsData[category.id] = nonFeaturedProducts;
            console.log(`✅ Đã tải ${nonFeaturedProducts.length} sản phẩm (không nổi bật) cho ${category.name}`);
          } else {
            productsData[category.id] = [];
            console.log(`⚠️ Không có sản phẩm cho ${category.name}`);
          }
        } catch (err) {
          console.error(`❌ Lỗi tải sản phẩm cho danh mục ${category.name}:`, err);
          productsData[category.id] = [];
        }
      }
      
      console.log("📦 Tất cả sản phẩm đã tải:", productsData);
      setProductsByCategory(productsData);
      
    } catch (err) {
      console.error("❌ Lỗi tải dữ liệu:", err);
      setError(`Lỗi tải dữ liệu: ${err.message || 'Không xác định'}`);
    } finally {
      setLoading(false);
    }
  };

  // ================================
  // HELPER FUNCTIONS
  // ================================
  
  const getGridClasses = () => {
    const gridConfig = {
      default: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 w-full",
      compact: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full",
      detailed: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full"
    };
    return gridConfig[variant] || gridConfig.default;
  };

  // Default callbacks cho ProductCard
  const defaultCallbacks = {
    onAddToCart: (product) => console.log('🛒 Thêm vào giỏ:', product.name),
    onAddToWishlist: (product) => console.log('❤️ Thêm vào yêu thích:', product.name),
    onQuickView: (product) => console.log('👁️ Xem nhanh:', product.name)
  };


  // ================================
  // LOADING & ERROR STATES
  // ================================
  
  if (loading && categories.length === 0) {
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
              <FaBox className="text-6xl text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Không thể tải dữ liệu
              </h2>
              <p className="text-gray-600 text-lg mb-6">
                Có lỗi xảy ra khi tải dữ liệu sản phẩm. Vui lòng thử lại sau.
              </p>
              <Button 
                onClick={() => {
                  setError(null);
                  fetchData();
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
    <div className="text-center mb-16">
      <div className="inline-block">
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full text-white">
            <FaBox className="text-2xl" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            SẢN PHẨM THEO DANH MỤC
          </h1>
        </div>
        <div className="w-32 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 mx-auto rounded-full mb-6"></div>
        <p className="text-gray-600 text-xl max-w-3xl mx-auto leading-relaxed">
          Khám phá bộ sưu tập nội thất văn phòng cao cấp được phân loại theo từng danh mục
        </p>
      </div>
    </div>
  );

  // Component đơn giản cho từng danh mục
  const CategorySection = ({ category, products, isLoading }) => (
    <div className="mb-16">
       {/* Header danh mục đơn giản */}
       <div className="mb-8">
         <div className="mb-4 flex items-center">
           <h2 className="text-5xl font-medium text-black mr-4 capitalize tracking-wide drop-shadow-lg">
             {category.name}
           </h2>
           <div className="flex-1 h-0.5 relative overflow-hidden">
             {/* Nền gradient tươi mát */}
             <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 rounded-full"></div>
             
             {/* Hiệu ứng ánh sáng tươi mát */}
             <div 
               className="absolute inset-0 rounded-full"
               style={{
                 background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
                 animation: 'diamond-shine 5s ease-in-out infinite'
               }}
             ></div>
             
             {/* Hiệu ứng sóng màu tươi mát */}
             <div 
               className="absolute inset-0 rounded-full"
               style={{
                 background: 'linear-gradient(90deg, transparent, rgba(34, 197, 94, 0.4), rgba(59, 130, 246, 0.4), rgba(147, 51, 234, 0.4), transparent)',
                 backgroundSize: '200% 100%',
                 animation: 'wave-shimmer 6s ease-in-out infinite'
               }}
             ></div>
             
             {/* Hiệu ứng điểm sáng tươi mát */}
             <div 
               className="absolute inset-0 rounded-full"
               style={{
                 background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.4) 0%, transparent 50%)',
                 animation: 'spotlight 8s linear infinite'
               }}
             ></div>
           </div>
         </div>
         {category.description && (
           <p className="text-gray-600 text-lg max-w-2xl leading-relaxed">
             {category.description}
           </p>
         )}
       </div>

      {/* Grid sản phẩm */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="py-6">
              <FaBox className="text-4xl text-gray-300 mx-auto mb-3" />
              <h4 className="text-lg font-semibold text-gray-500 mb-2">Chưa có sản phẩm</h4>
              <p className="text-gray-400">Danh mục {category.name} hiện chưa có sản phẩm nào</p>
            </CardContent>
          </Card>
        </div>
       ) : (
         <div 
           className={`${getGridClasses()}`}
           style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}
         >
           {products.map((product) => (
             <ProductCard 
               key={product.id}
               product={product} 
               variant={variant}
               showActions={showActions}
               onAddToCart={onAddToCart || defaultCallbacks.onAddToCart}
               onAddToWishlist={onAddToWishlist || defaultCallbacks.onAddToWishlist}
               onQuickView={onQuickView || defaultCallbacks.onQuickView}
             />
           ))}
         </div>
       )}
    </div>
  );


  
  return (
    <div className={`py-16 bg-white ${className}`}>
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        {renderHeader()}
        
        {/* Sản phẩm theo từng danh mục */}
        {categories.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            products={productsByCategory[category.id] || []}
            isLoading={loading}
          />
        ))}
      </div>
    </div>
  );
};

export default CategoryProducts;