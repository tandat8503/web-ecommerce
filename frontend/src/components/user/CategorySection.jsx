import { useState, useEffect, useRef } from "react";
import { Typography, Button, Spin } from "antd";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { getProductsByCategorySlug } from "../../api/products";
import ProductCard from "./ProductCard";

const { Title } = Typography;

const CategorySection = ({ category, limit = 3 }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef(null);

  // Fetch products by category
  useEffect(() => {
    const fetchProducts = async () => {
      if (!category?.slug) return;
      
      try {
        setLoading(true);
        console.log("🔄 Đang tải sản phẩm cho danh mục:", category.name);
        
        const res = await getProductsByCategorySlug(category.slug);
        console.log("✅ Dữ liệu sản phẩm:", res);
        console.log("📊 Số lượng sản phẩm:", res.products?.length || 0);
        console.log("📋 Danh mục:", res.category);
        
        setProducts(res.products || []);
      } catch (err) {
        console.error("❌ Lỗi tải sản phẩm:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [category?.slug]);

  // Navigation functions
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollAmount = container.clientWidth;
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollAmount = container.clientWidth;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!category) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
      {/* Header với icon và navigation arrows */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {/* Icon danh mục */}
          <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
            <span className="text-gray-600 text-lg">
              {category.name.includes('Bàn') && '🪑'}
              {category.name.includes('Ghế') && '🪑'}
              {category.name.includes('Tủ') && '🗄️'}
              {category.name.includes('Sofa') && '🛋️'}
              {!category.name.includes('Bàn') && !category.name.includes('Ghế') && !category.name.includes('Tủ') && !category.name.includes('Sofa') && '📦'}
            </span>
          </div>
          <Title level={3} className="text-2xl font-bold text-gray-800 mb-0">
            {category.name}
          </Title>
        </div>

        {/* Navigation arrows */}
        <div className="flex items-center gap-2">
          <Button
            icon={<FaChevronLeft />}
            className="rounded-full w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 border-0"
            onClick={scrollLeft}
          />
          <Button
            icon={<FaChevronRight />}
            className="rounded-full w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 border-0"
            onClick={scrollRight}
          />
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Spin size="large" />
        </div>
      ) : (
        <div 
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.length > 0 ? (
            products.map((product) => (
              <div key={product.id} className="flex-shrink-0 w-80">
                <ProductCard product={product} />
              </div>
            ))
          ) : (
            <div className="flex-1 text-center py-12">
              <div className="text-4xl mb-2">📦</div>
              <p className="text-gray-500">Chưa có sản phẩm nào trong danh mục này</p>
            </div>
          )}
        </div>
      )}

      {/* CSS cho scrollbar ẩn */}
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default CategorySection;
