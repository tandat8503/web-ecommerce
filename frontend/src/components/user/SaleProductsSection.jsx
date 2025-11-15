import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FaTag } from "react-icons/fa";
import ProductCard from "./ProductCard";
import { getPublicProducts } from "../../api/adminProducts";

/**
 * SaleProductsSection Component - Section sản phẩm đang sale cho trang chủ
 * 
 * MỤC ĐÍCH:
 * - Hiển thị sản phẩm đang giảm giá trên trang chủ
 * - Tái sử dụng ProductCard đã có
 * - Layout compact phù hợp với trang chủ
 * 
 * @param {Object} props - Props của component
 * @param {number} [props.limit=9] - Số lượng sản phẩm hiển thị
 * @param {boolean} [props.showActions=true] - Hiển thị các nút yêu thích và xem chi tiết
 * @param {string} [props.className=""] - CSS class tùy chỉnh
 * 
 * @returns {JSX.Element} Component SaleProductsSection
 */
const SaleProductsSection = ({ 
  limit = 9,//Số lượng sản phẩm hiển thị
  showActions = true,//Hiển thị các nút yêu thích và xem chi tiết
  className = "",//CSS class tùy chỉnh
}) => {
  // ================================
  // STATE MANAGEMENT
  // ================================
  
  const [saleProducts, setSaleProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ================================
  // EFFECTS
  // ================================
  
  useEffect(() => {
    fetchSaleProducts();
  }, [limit]);

  // ================================
  // API FUNCTIONS
  // ================================
  
  const fetchSaleProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("🏷️ Bắt đầu tải sản phẩm đang sale cho trang chủ...");
      
      // Backend tự động filter onSale: true (salePrice !== null)
      const response = await getPublicProducts({
        page: 1,
        limit: limit,
        onSale: true
      });
      
      console.log("🏷️ Response sản phẩm đang sale:", response);
      
      // Backend trả về đúng số lượng cần thiết
      const products = response.data?.items || [];
      
      console.log(`🏷️ Đã tải ${products.length} sản phẩm đang sale cho trang chủ`);
      setSaleProducts(products);
      
    } catch (err) {
      console.error("❌ Lỗi tải sản phẩm đang sale:", err);
      setError(`Lỗi tải dữ liệu: ${err.message || 'Không xác định'}`);
    } finally {
      setLoading(false);
    }
  };

  // Debug log
  console.log("🏷️ SaleProductsSection render - Số sản phẩm:", saleProducts.length, "Loading:", loading, "Error:", error);
  
  // ================================
  // RENDER UI
  // ================================
  
  if (loading) {
    return (
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-gray-600">Đang tải sản phẩm đang sale...</span>
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
              <FaTag className="text-6xl text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Không thể tải sản phẩm đang sale
              </h2>
              <p className="text-gray-600 text-lg mb-6">
                Có lỗi xảy ra khi tải dữ liệu sản phẩm. Vui lòng thử lại sau.
              </p>
              <Button 
                onClick={() => {
                  setError(null);
                  fetchSaleProducts();
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
              SẢN PHẨM ĐANG SALE
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-red-500 via-pink-500 to-red-600 mx-auto rounded-full mb-4"></div>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
              Ưu đãi đặc biệt - Giảm giá hấp dẫn cho các sản phẩm chất lượng
            </p>
          </div>
        </div>
        
        {/* Sản phẩm đang sale */}
        {saleProducts.length === 0 ? (
          <div className="text-center py-12">
            <Card className="max-w-md mx-auto">
              <CardContent className="py-6">
                <FaTag className="text-4xl text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-500 mb-2">Chưa có sản phẩm đang sale</h3>
                <p className="text-gray-400">Hiện tại chưa có sản phẩm nào đang giảm giá</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {saleProducts.map((product) => (
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

export default SaleProductsSection;

