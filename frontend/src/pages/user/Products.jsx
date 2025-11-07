import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPublicProducts } from '../../api/adminProducts'; // ✅ Đổi sang API public (không cần token)
import adminCategoriesAPI from '../../api/adminCategories';
import adminBrandsAPI from '../../api/adminBrands';
import ProductCard from '../../components/user/ProductCard';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { FaSearch, FaFilter } from 'react-icons/fa';
import BreadcrumbNav from '../../components/user/BreadcrumbNav';

/**
 * Products Component - Trang hiển thị tất cả sản phẩm
 * 
 * Mục đích: Hiển thị danh sách sản phẩm với các tính năng:
 * - Tìm kiếm sản phẩm theo tên
 * - Lọc theo danh mục và thương hiệu
 * - Phân trang (6 sản phẩm/trang)
 * - Breadcrumb navigation
 * - Responsive grid layout (3 cột trên desktop)
 * 
 * API sử dụng: getPublicProducts() - API public không cần token, chỉ lấy sản phẩm ACTIVE
 * Dữ liệu: Lấy từ backend với cấu trúc { items, total, page, limit }
 */
const Products = () => {
  // =======================
  // STATE MANAGEMENT
  // =======================
  
  // Hook để quản lý URL search parameters (q, categoryId, brandId)
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State cho dữ liệu chính
  const [products, setProducts] = useState([]);        // Danh sách sản phẩm hiện tại
  const [categories, setCategories] = useState([]);    // Danh sách danh mục cho filter
  const [brands, setBrands] = useState([]);            // Danh sách thương hiệu cho filter
  const [loading, setLoading] = useState(true);        // Trạng thái loading
  const [error, setError] = useState(null);            // Thông báo lỗi nếu có
  
  // State cho phân trang
  const [pagination, setPagination] = useState({
    page: 1,           // Trang hiện tại
    limit: 6,          // Số sản phẩm mỗi trang
    total: 0,          // Tổng số sản phẩm
    totalPages: 0      // Tổng số trang
  });
  
  // State cho bộ lọc và tìm kiếm
  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',                    // Từ khóa tìm kiếm
    categoryId: searchParams.get('categoryId') || '',  // ID danh mục được chọn
    brandId: searchParams.get('brandId') || ''         // ID thương hiệu được chọn
  });
  
  // State cho UI (hiện tại chưa sử dụng)
  const [showFilters, setShowFilters] = useState(false);

  // =======================
  // LIFECYCLE EFFECTS
  // =======================
  
  // Effect 1: Load dữ liệu ban đầu khi component mount
  // Chỉ chạy 1 lần khi component được tạo
  // Load categories và brands (không block việc load products)
  useEffect(() => {
    loadInitialData();
  }, []);

  // Effect 2: Load sản phẩm khi component mount hoặc filters/page thay đổi
  // Load ngay lập tức khi component mount và load lại khi filters/page thay đổi
  useEffect(() => {
    loadProducts();
  }, [filters, pagination.page]);

  // =======================
  // API FUNCTIONS
  // =======================
  
  /**
   * Load dữ liệu ban đầu (categories và brands) cho dropdown filters
   * Chạy song song 2 API calls để tối ưu performance
   * Nếu có lỗi thì chỉ log, không set error để không ảnh hưởng đến việc load products
   */
  const loadInitialData = async () => {
    try {
      // Gọi song song 2 API để lấy categories và brands
      // Sử dụng Promise.allSettled để không bị dừng nếu 1 trong 2 API lỗi
      const [categoriesRes, brandsRes] = await Promise.allSettled([
        adminCategoriesAPI.getCategories(),
        adminBrandsAPI.getBrands()
      ]);
      
      // Xử lý categories - nếu thành công thì set, nếu lỗi thì để mảng rỗng
      if (categoriesRes.status === 'fulfilled') {
        const categoriesData = categoriesRes.value.data?.items || categoriesRes.value.data || [];
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      } else {
        console.warn('Failed to load categories:', categoriesRes.reason);
        setCategories([]);
      }
      
      // Xử lý brands - nếu thành công thì set, nếu lỗi thì để mảng rỗng
      if (brandsRes.status === 'fulfilled') {
        const brandsData = brandsRes.value.data?.items || brandsRes.value.data || [];
        setBrands(Array.isArray(brandsData) ? brandsData : []);
      } else {
        console.warn('Failed to load brands:', brandsRes.reason);
        setBrands([]);
      }
    } catch (err) {
      // Chỉ log lỗi, không set error để không ảnh hưởng đến việc load products
      console.warn('Error loading initial data:', err);
      setCategories([]);
      setBrands([]);
    }
  };

  /**
   * Load danh sách sản phẩm với filters và pagination
   * Sử dụng getPublicProducts() API (không cần token) với các tham số:
   * - page, limit: Phân trang
   * - q: Tìm kiếm theo tên
   * - categoryId, brandId: Lọc theo danh mục/thương hiệu
   * Backend tự động chỉ trả về sản phẩm ACTIVE
   */
  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Chuẩn bị tham số API
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        q: filters.q || undefined,
        categoryId: filters.categoryId || undefined,
        brandId: filters.brandId || undefined
        // ✅ Không cần truyền status, backend tự động lọc ACTIVE cho public API
      };
      
      // Loại bỏ các giá trị rỗng để tránh gửi params không cần thiết
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });
      
          // ✅ Gọi API public (không cần token, tự động lọc ACTIVE)
          const response = await getPublicProducts(params);
          
          if (response.data) {
            // Xử lý dữ liệu sản phẩm theo cấu trúc API backend: { items, total, page, limit }
            const productsData = response.data.items || [];
            const totalItems = response.data.total || 0;
            
            // Debug: Log dữ liệu sản phẩm để kiểm tra
            console.log('Products data:', productsData);
            if (productsData.length > 0) {
              console.log('First product:', productsData[0]);
              console.log('Product ID:', productsData[0].id);
              console.log('Product slug:', productsData[0].slug);
            }
            
            // Cập nhật state sản phẩm và phân trang
            setProducts(Array.isArray(productsData) ? productsData : []);
            setPagination(prev => ({
              ...prev,
              total: totalItems,
              totalPages: Math.ceil(totalItems / pagination.limit)
            }));
          }
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  // =======================
  // EVENT HANDLERS
  // =======================
  
  /**
   * Xử lý khi user thay đổi filter (search, category, brand)
   * - Cập nhật state filters
   * - Reset về trang 1
   * - Cập nhật URL parameters để có thể share link
   */
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset về trang 1 khi filter thay đổi
    
    // Cập nhật URL params để có thể share link với filters
    const newSearchParams = new URLSearchParams(searchParams);
    if (value) {
      newSearchParams.set(key, value);
    } else {
      newSearchParams.delete(key);
    }
    setSearchParams(newSearchParams);
  };

  /**
   * Xử lý khi user chuyển trang
   * - Cập nhật page trong pagination state
   * - Scroll lên đầu trang để user thấy sản phẩm mới
   */
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Xử lý khi user submit form search
   * - Ngăn form reload trang
   * - Gọi lại API với từ khóa tìm kiếm mới
   */
  const handleSearch = (e) => {
    e.preventDefault();
    loadProducts();
  };

  /**
   * Xóa tất cả filters và reset về trạng thái ban đầu
   * - Reset filters về rỗng
   * - Reset về trang 1
   * - Xóa URL parameters
   */
  const clearFilters = () => {
    setFilters({
      q: '',
      categoryId: '',
      brandId: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
    setSearchParams({});
  };

  // =======================
  // RENDER LOGIC
  // =======================
  
  // Loading state: Hiển thị spinner khi đang tải dữ liệu lần đầu
  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Đang tải sản phẩm...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main render: Hiển thị trang sản phẩm hoàn chỉnh
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section: Breadcrumb + Title + Stats */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          {/* Breadcrumb Navigation */}
          <div className="mb-4">
            <BreadcrumbNav />
          </div>

          {/* Title và thống kê sản phẩm */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tất cả sản phẩm</h1>
              <p className="text-gray-600 mt-1">
                {pagination.total > 0 
                  ? `Hiển thị ${products.length} trong ${pagination.total} sản phẩm`
                  : 'Không tìm thấy sản phẩm nào'
                }
              </p>
            </div>
            
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <div className="lg:w-80">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FaFilter className="h-5 w-5" />
                    Bộ lọc
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs"
                  >
                    Xóa tất cả
                  </Button>
                </div>

                {/* Search - FullText Search */}
                <form onSubmit={handleSearch} className="mb-6">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Tìm kiếm sản phẩm (FullText search)..."
                      value={filters.q}
                      onChange={(e) => handleFilterChange('q', e.target.value)}
                      className="pl-10"
                      onKeyDown={(e) => {
                        // Auto search khi nhấn Enter
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearch(e);
                        }
                      }}
                    />
                  </div>
                  {filters.q && (
                    <p className="text-xs text-gray-500 mt-2">
                      🔍 Tìm kiếm thông minh: tìm trong tên và mô tả sản phẩm
                    </p>
                  )}
                </form>

                {/* Category Filter */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Danh mục
                  </label>
                  <select
                    value={filters.categoryId}
                    onChange={(e) => handleFilterChange('categoryId', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Tất cả danh mục</option>
                    {Array.isArray(categories) && categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Brand Filter */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thương hiệu
                  </label>
                  <select
                    value={filters.brandId}
                    onChange={(e) => handleFilterChange('brandId', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Tất cả thương hiệu</option>
                    {Array.isArray(brands) && brands.map(brand => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>

              </CardContent>
            </Card>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {products.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg mb-4">Không tìm thấy sản phẩm nào</div>
                <Button onClick={clearFilters} variant="outline">
                  Xóa bộ lọc
                </Button>
              </div>
            ) : (
              <>
                {/* Products Grid */}
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {products.map(product => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onAddToWishlist={(product) => console.log('Add to wishlist:', product)}
                        />
                      ))}
                    </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-12">
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      Trước
                    </Button>
                    
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        const current = pagination.page;
                        return page === 1 || page === pagination.totalPages || 
                               (page >= current - 2 && page <= current + 2);
                      })
                      .map((page, index, array) => (
                        <React.Fragment key={page}>
                          {index > 0 && array[index - 1] !== page - 1 && (
                            <span className="px-2 text-gray-400">...</span>
                          )}
                          <Button
                            variant={pagination.page === page ? 'default' : 'outline'}
                            onClick={() => handlePageChange(page)}
                            className="w-10 h-10"
                          >
                            {page}
                          </Button>
                        </React.Fragment>
                      ))}
                    
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      Sau
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;
