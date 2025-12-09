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
import { FaBox, FaArrowLeft } from "react-icons/fa";
import Navbar from "../../components/user/Navbar";
import ProductCard from "../../components/user/ProductCard";
import { getPublicProducts } from "../../api/adminProducts";
import { getPublicCategories } from "../../api/adminCategories";
import { onCategoryUpdated } from "../../utils/socket";
import { 
  onProductCreated, 
  onProductUpdated, 
  onProductDeleted 
} from "../../utils/socket";

/**
 * CategoryPage - Trang hiển thị sản phẩm theo danh mục
 * Route: /danh-muc/:slug
 */
const CategoryPage = () => {
  const { slug } = useParams();// Lấy slug từ URL
  const navigate = useNavigate();// Dùng để chuyển hướng
  
  // State
  const [category, setCategory] = useState(null);// Lưu trữ category hiện tại
  const [products, setProducts] = useState([]);// Lưu trữ danh sách sản phẩm hiện tại
  const [loading, setLoading] = useState(true);// Lưu trữ trạng thái loading
  const [error, setError] = useState(null);// Lưu trữ lỗi hiện tại
  const [page, setPage] = useState(1);// Lưu trữ trang hiện tại
  const [total, setTotal] = useState(0);// Lưu trữ tổng số sản phẩm
  const [sortBy, setSortBy] = useState("createdAt");// Lưu trữ cột sắp xếp hiện tại
  const [sortOrder, setSortOrder] = useState("desc");// Lưu trữ thứ tự sắp xếp hiện tại
  
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

  // ✅ Lắng nghe socket event khi category được cập nhật (tắt/bật)
  useEffect(() => {
    if (!category) return;

    const unsubscribe = onCategoryUpdated((updatedCategory) => {
      // Chỉ cập nhật nếu là category hiện tại
      if (updatedCategory.slug === slug || updatedCategory.id === category.id) {
        console.log('🔄 Category được cập nhật:', updatedCategory);
        
        // Cập nhật category state
        setCategory(prev => ({
          ...prev,
          ...updatedCategory
        }));

        // Nếu category bị tắt, clear products và set error
        if (!updatedCategory.isActive) {
          setProducts([]);
          setTotal(0);
          setError("Danh mục này đã bị tạm dừng");
        } else {
          // Nếu category được bật lại, clear error và fetch lại products
          setError(null);
        }
      }
    });

    return unsubscribe;
  }, [category, slug]);

  // Socket real-time: Cập nhật products khi admin CRUD
  useEffect(() => {
    if (!category) return;

    // Sản phẩm mới → Thêm vào danh sách (nếu cùng category, ACTIVE và category active)
    const unsubscribeCreated = onProductCreated((newProduct) => {
      if (newProduct.categoryId === category.id && 
          newProduct.status === 'ACTIVE' && 
          category.isActive) {
        setProducts(prev => {
          const exists = prev.some(p => p.id === newProduct.id);
          if (exists) {
            return prev.map(p => p.id === newProduct.id ? newProduct : p);
          }
          return [newProduct, ...prev];
        });
        setTotal(prev => prev + 1);
      }
    });

    // Sản phẩm cập nhật → Cập nhật hoặc xóa
    const unsubscribeUpdated = onProductUpdated((updatedProduct) => {
      if (updatedProduct.categoryId === category.id) {
        console.log('🔄 Socket: Product updated trong category', updatedProduct);
        // Chỉ hiển thị nếu status = 'ACTIVE' và category đang active
        const shouldShow = updatedProduct.status === 'ACTIVE' && category.isActive;
        
        setProducts(prev => {
          const exists = prev.some(p => p.id === updatedProduct.id);
          if (exists) {
            if (shouldShow) {
              // Cập nhật product (merge để giữ lại variants nếu có)
              console.log('✅ Product vẫn ACTIVE và category active, cập nhật:', updatedProduct.id, 'stockQuantity:', updatedProduct.stockQuantity);
              return prev.map(p => {
                if (p.id === updatedProduct.id) {
                  // Merge với product cũ để giữ lại variants nếu socket không gửi
                  return { ...p, ...updatedProduct };
                }
                return p;
              });
            } else {
              // Xóa product nếu bị tắt (INACTIVE/OUT_OF_STOCK) hoặc category bị tắt
              console.log('❌ Product bị tắt (status:', updatedProduct.status, ') hoặc category bị tắt, xóa khỏi danh sách:', updatedProduct.id);
              setTotal(prev => Math.max(0, prev - 1));
              return prev.filter(p => p.id !== updatedProduct.id);
            }
          } else if (shouldShow) {
            // Thêm product mới nếu chưa có và ACTIVE
            console.log('✅ Product mới ACTIVE trong category active, thêm vào danh sách:', updatedProduct.id, 'stockQuantity:', updatedProduct.stockQuantity);
            setTotal(prev => prev + 1);
            return [updatedProduct, ...prev];
          }
          return prev;
        });
      }
    });

    // Sản phẩm xóa → Xóa khỏi danh sách
    const unsubscribeDeleted = onProductDeleted((data) => {
      setProducts(prev => {
        const filtered = prev.filter(p => p.id !== data.id);
        if (filtered.length !== prev.length) {
          setTotal(prev => Math.max(0, prev - 1));
        }
        return filtered;
      });
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
    };
  }, [category]);

  // Fetch products khi category, page, sort thay đổi
  useEffect(() => {
    if (!category) return;
    
    // ✅ Kiểm tra category có đang hoạt động không
    if (!category.isActive) {
      setProducts([]);
      setTotal(0);
      setError("Danh mục này đã bị tạm dừng");
      setLoading(false);
      return;
    }
    
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
        
        // ✅ Kiểm tra message từ backend (nếu category bị tắt sau khi fetch)
        if (data?.message && data.message.includes("tạm dừng")) {
          setProducts([]);
          setTotal(0);
          setError(data.message);
        } else {
          setProducts(data?.items || []);
          setTotal(data?.total || 0);
        }
        
      } catch (err) {
        console.error("❌ Lỗi tải sản phẩm:", err);
        // ✅ Kiểm tra message từ error response
        if (err.response?.data?.message) {
          setError(err.response.data.message);
        } else {
          setError("Không thể tải sản phẩm");
        }
        setProducts([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [category, page, sortBy, sortOrder]);

  // Handlers
  const handleSortChange = (value) => {
    const [newSortBy, newSortOrder] = value.split("-");//createdAt-desc, price-asc
    setSortBy(newSortBy);//createdAt, price
    setSortOrder(newSortOrder);//desc, asc
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
                <SelectItem value="price-asc">Giá thấp đến cao</SelectItem>
                <SelectItem value="price-desc">Giá cao đến thấp</SelectItem>
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
                {error && error.includes("tạm dừng") ? "Danh mục đã bị tạm dừng" : "Chưa có sản phẩm"}
              </h3>
              <p className="text-gray-500 mb-4">
                {error && error.includes("tạm dừng") 
                  ? "Danh mục này hiện đã bị tạm dừng. Vui lòng quay lại sau."
                  : "Danh mục này hiện chưa có sản phẩm nào"
                }
              </p>
              {error && error.includes("tạm dừng") && (
                <Button onClick={() => navigate("/")} className="px-6 py-2">
                  <FaArrowLeft className="mr-2" /> Về trang chủ
                </Button>
              )}
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

