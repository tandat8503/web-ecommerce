import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Pagination } from "antd";
import { FaBox } from "react-icons/fa";
import Navbar from "../../components/user/Navbar";
import ProductCard from "../../components/user/ProductCard";
import { getPublicProducts } from "../../api/adminProducts";
import { getPublicCategories } from "../../api/adminCategories";

/**
 * CategoryPage - Trang hiển thị sản phẩm theo danh mục
 * Route: /danh-muc/:slug
 */
const CategoryPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  // State
  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  
  const limit = 12; // 12 sản phẩm mỗi trang (4 hàng x 3 cột)

  // Helper function để xác định parent category
  const getParentCategory = (category) => {
    const name = category.name.toLowerCase().trim();
    const slug = category.slug.toLowerCase();
    
    if (name.startsWith("ghế") || slug.startsWith("ghe")) {
      return { name: "Ghế Văn Phòng", slug: "ghe-van-phong" };
    } else if (name.startsWith("bàn") || slug.startsWith("ban")) {
      return { name: "Bàn Văn Phòng", slug: "ban-van-phong" };
    } else {
      return { name: "Nội Thất Khác", slug: "noi-that-khac" };
    }
  };

  // Fetch category by slug
  useEffect(() => {
    const fetchCategory = async () => {
      try {
        const response = await getPublicCategories();
        const categories = response.data?.items || response.data || [];
        const found = categories.find(cat => cat.slug === slug);
        
        if (!found) {
          setError("Không tìm thấy danh mục");
          setCategory(null);
        } else {
          setCategory(found);
        }
      } catch (err) {
        console.error(" Lỗi tải danh mục:", err);
        setError("Không thể tải danh mục");
      }
    };
    
    fetchCategory();
  }, [slug]);

  // Fetch products khi category, page, sort thay đổi
  useEffect(() => {
    if (!category) return;
    
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await getPublicProducts({
          categoryId: category.id,
          page,
          limit,
          sortBy,
          sortOrder
        });
        
        const data = response.data;
        setProducts(data?.items || []);
        setTotal(data?.total || 0);
        
      } catch (err) {
        console.error("❌ Lỗi tải sản phẩm:", err);
        setError("Không thể tải sản phẩm");
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [category, page, sortBy, sortOrder]);

  // Handlers
  const handleSortChange = (value) => {
    const [newSortBy, newSortOrder] = value.split("-");
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1); // Reset về trang 1
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Loading state
  if (!category && loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-gray-600">Đang tải danh mục...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state hoặc không tìm thấy category
  if (error || !category) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="py-16">
            <Card className="max-w-2xl mx-auto">
              <CardContent className="py-8">
                <FaBox className="text-6xl text-gray-300 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
                  {error || "Không tìm thấy danh mục"}
                </h2>
                <p className="text-gray-600 text-lg mb-6 text-center">
                  Danh mục bạn tìm kiếm không tồn tại hoặc đã bị xóa.
                </p>
                <div className="text-center">
                  <Button onClick={() => navigate("/")} className="px-8 py-3">
                    <FaArrowLeft className="mr-2" /> Về trang chủ
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          {/* Breadcrumb */}
          <div className="mt-8 mb-6">
            <Breadcrumb>
              <BreadcrumbList>
                {/* Trang chủ */}
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link 
                      to="/" 
                      className="hover:text-blue-600 transition-colors duration-200 font-medium"
                    >
                      Trang chủ
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                
                {/* Parent category (Bàn Văn Phòng, Ghế Văn Phòng, hoặc Nội Thất Khác) */}
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-gray-600 font-medium">
                    {getParentCategory(category).name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                
                {/* Category hiện tại */}
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-blue-600 font-semibold">
                    {category.name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          
          {/* Category Banner */}
          {category.imageUrl && (
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <img
                src={category.imageUrl}
                alt={category.name}
                className="w-full h-64 md:h-96 object-cover"
              />
            </div>
          )}
        </div>

        {/* Toolbar: Sort */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <span className="text-gray-700 font-medium">Sắp xếp:</span>
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[200px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">Mới nhất</SelectItem>
                <SelectItem value="createdAt-asc">Cũ nhất</SelectItem>
                <SelectItem value="price-asc">Giá thấp đến cao</SelectItem>
                <SelectItem value="price-desc">Giá cao đến thấp</SelectItem>
                <SelectItem value="name-asc">Tên A-Z</SelectItem>
                <SelectItem value="name-desc">Tên Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <span className="ml-4 text-gray-600">Đang tải sản phẩm...</span>
          </div>
        ) : products.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <FaBox className="text-5xl text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Chưa có sản phẩm
              </h3>
              <p className="text-gray-500">
                Danh mục này hiện chưa có sản phẩm nào
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Grid 3 cột */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} showActions={true} />
              ))}
            </div>

            {/* Pagination */}
            {total > limit && (
              <div className="flex justify-center mt-8 category-pagination">
                <style>{`
                  /* Ẩn phần text "1-6 của 24 sản phẩm" */
                  .category-pagination .ant-pagination li {
                    font-size: 0 !important;
                  }
                  .category-pagination .ant-pagination li a,
                  .category-pagination .ant-pagination li button {
                    font-size: 14px !important;
                  }
                  /* Ẩn tất cả li không phải là item, prev, next */
                  .category-pagination .ant-pagination > li:not([class*="item"]):not([class*="prev"]):not([class*="next"]):not([class*="jump"]) {
                    display: none !important;
                  }
                `}</style>
                <Pagination
                  current={page}
                  total={total}
                  pageSize={limit}
                  showSizeChanger={false}
                  showQuickJumper={false}
                  onChange={handlePageChange}
                  className="text-center"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CategoryPage;

