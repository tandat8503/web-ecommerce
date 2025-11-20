import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Row, Col, Spin, Empty, Pagination, Card, Tag, Select } from "antd";
import { ShoppingCartOutlined, HeartOutlined } from "@ant-design/icons";
import { getPublicProducts } from "@/api/adminProducts";

const { Meta } = Card;
const { Option } = Select;

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // ✅ LẤY SEARCH QUERY TỪ URL
  const searchQuery = searchParams.get("q") || "";
  const pageParam = parseInt(searchParams.get("page")) || 1;
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(pageParam);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [fallbackProducts, setFallbackProducts] = useState([]);
  
  const limit = 12;

  // ✅ FETCH PRODUCTS (với hoặc không có search)
  useEffect(() => {
  const fetchProducts = async () => {
    try {
      setLoading(true);
        
        const params = {
          page,
          limit,
          sortBy,
          sortOrder
        };
        
        // ✅ NẾU CÓ SEARCH QUERY, THÊM VÀO PARAMS
        if (searchQuery.trim()) {
          params.q = searchQuery;
        }
      
        const response = await getPublicProducts(params);
        const items = response.data?.items || [];
        setProducts(items);
        setTotal(response.data?.total || 0);
        
        // ✅ Nếu không có kết quả và có search query, fetch fallback products
        if (items.length === 0 && searchQuery.trim()) {
          try {
            const fallbackResponse = await getPublicProducts({
              limit: 6,
              sortBy: 'isFeatured',
              sortOrder: 'desc'
            });
            setFallbackProducts(fallbackResponse.data?.items || []);
          } catch (err) {
            console.error("Lỗi tải fallback products:", err);
          }
        }
        
    } catch (error) {
      console.error("Lỗi tải sản phẩm:", error);
    } finally {
      setLoading(false);
    }
  };

    fetchProducts();
  }, [searchQuery, page, sortBy, sortOrder]);

  // ✅ SYNC page state với URL
  useEffect(() => {
    setPage(pageParam);
  }, [pageParam]);

  // ✅ HANDLER PAGINATION
  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage);
    setSearchParams(params);
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ✅ HANDLER SORT
  const handleSortChange = (value) => {
    const [newSortBy, newSortOrder] = value.split("-");
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1);
    const params = new URLSearchParams(searchParams);
    params.set("page", "1");
    setSearchParams(params);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  // ✅ FEATURE #3: Calculate Search Stats
  const searchStats = useMemo(() => {
    if (products.length === 0 || !searchQuery) return null;
    
    const prices = products.map(p => Number(p.price)).filter(p => !isNaN(p));
    const categories = [...new Set(products.map(p => p.category?.name).filter(Boolean))];
    const brands = [...new Set(products.map(p => p.brand?.name).filter(Boolean))];
    const onSale = products.filter(p => p.salePrice && Number(p.salePrice) < Number(p.price)).length;
    
    return {
      minPrice: prices.length > 0 ? Math.min(...prices) : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
      categories: categories.slice(0, 3),
      totalCategories: categories.length,
      brands: brands.slice(0, 3),
      totalBrands: brands.length,
      onSaleCount: onSale
    };
  }, [products, searchQuery]);

  // Suggested keywords for no results
  const suggestedKeywords = ['ghế văn phòng', 'bàn làm việc', 'tủ tài liệu', 'ghế giám đốc', 'bàn họp'];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {searchQuery ? (
              <>
                Kết quả tìm kiếm: <span className="text-blue-600">"{searchQuery}"</span>
              </>
            ) : (
              "Tất cả sản phẩm"
            )}
          </h1>
          <p className="text-gray-600">
            Tìm thấy <span className="font-semibold text-blue-600">{total}</span> sản phẩm
          </p>
        </div>

        {/* ✅ FEATURE #3: Search Stats Bar */}
        {searchStats && !loading && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💰</span>
                <div>
                  <p className="text-gray-600 text-xs">Khoảng giá</p>
                  <p className="font-semibold text-gray-800">
                    {formatPrice(searchStats.minPrice)} - {formatPrice(searchStats.maxPrice)}
                  </p>
                </div>
              </div>
              
              {searchStats.totalCategories > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🏷️</span>
                  <div>
                    <p className="text-gray-600 text-xs">Danh mục</p>
                    <p className="font-semibold text-gray-800">
                      {searchStats.totalCategories} danh mục
                    </p>
                  </div>
                </div>
              )}
              
              {searchStats.totalBrands > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🏭</span>
                  <div>
                    <p className="text-gray-600 text-xs">Thương hiệu</p>
                    <p className="font-semibold text-gray-800">
                      {searchStats.totalBrands} thương hiệu
                    </p>
                  </div>
                </div>
              )}
              
              {searchStats.onSaleCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔥</span>
                  <div>
                    <p className="text-gray-600 text-xs">Đang sale</p>
                    <p className="font-semibold text-red-600">
                      {searchStats.onSaleCount} sản phẩm
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ✅ THÊM SORT DROPDOWN */}
        {!loading && products.length > 0 && (
          <div className="mb-6 flex justify-end">
            <Select
              value={`${sortBy}-${sortOrder}`}
              onChange={handleSortChange}
              style={{ width: 200 }}
              placeholder="Sắp xếp theo"
            >
              <Option value="createdAt-desc">Mới nhất</Option>
              <Option value="createdAt-asc">Cũ nhất</Option>
              <Option value="price-asc">Giá thấp đến cao</Option>
              <Option value="price-desc">Giá cao đến thấp</Option>
              <Option value="name-asc">Tên A-Z</Option>
              <Option value="name-desc">Tên Z-A</Option>
            </Select>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <Spin size="large" tip="Đang tìm kiếm sản phẩm..." />
          </div>
        )}

        {/* Products Grid */}
        {!loading && products.length > 0 && (
          <>
            <Row gutter={[16, 24]}>
              {products.map((product) => (
                <Col key={product.id} xs={24} sm={12} md={8} lg={6}>
                  <Link to={`/san-pham/${product.id}`}>
                    <Card
                      hoverable
                      cover={
                        <div className="relative overflow-hidden h-64 bg-gray-100">
                          <img
                            alt={product.name}
                            src={product.imageUrl || product.image_url || 'https://via.placeholder.com/300x300?text=No+Image'}
                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/300x300?text=No+Image';
                            }}
                          />
                          {product.salePrice && product.salePrice < product.price && (
                            <Tag color="red" className="absolute top-2 right-2">
                              SALE
                            </Tag>
                          )}
                          {product.isFeatured && (
                            <Tag color="gold" className="absolute top-2 left-2">
                              HOT
                            </Tag>
                          )}
                        </div>
                      }
                      actions={[
                        <HeartOutlined key="wishlist" className="text-red-500" />,
                        <ShoppingCartOutlined key="cart" className="text-blue-500" />
                      ]}
                    >
                      <Meta
                        title={
                          <div className="line-clamp-2 h-12" title={product.name}>
                            {product.name}
                          </div>
                        }
                        description={
                          <div>
                            {product.salePrice && product.salePrice < product.price ? (
                              <div>
                                <span className="text-red-500 font-bold text-lg">
                                  {formatPrice(product.salePrice)}
                                </span>
                                <br />
                                <span className="text-gray-400 line-through text-sm">
                                  {formatPrice(product.price)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-blue-600 font-bold text-lg">
                                {formatPrice(product.price)}
                              </span>
                            )}
                            <div className="mt-2 text-xs text-gray-500">
                              {product.category?.name && (
                                <Tag color="blue" className="text-xs">
                                  {product.category.name}
                                </Tag>
                              )}
                              {product.brand?.name && (
                                <Tag color="green" className="text-xs">
                                  {product.brand.name}
                                </Tag>
                              )}
                            </div>
                          </div>
                        }
                      />
                    </Card>
                  </Link>
                </Col>
              ))}
            </Row>

            {/* Pagination */}
            {total > limit && (
              <div className="flex justify-center mt-12">
                <Pagination
                  current={page}
                  total={total}
                  pageSize={limit}
                  onChange={handlePageChange}
                  showSizeChanger={false}
                  showTotal={(total) => `Tổng ${total} sản phẩm`}
                />
              </div>
            )}
          </>
        )}

        {/* ✅ FEATURE #2: Empty State with Smart Suggestions */}
        {!loading && products.length === 0 && (
          <div className="py-10">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div className="max-w-2xl mx-auto">
                  <p className="text-xl font-semibold text-gray-700 mb-2">
                    {searchQuery
                      ? `Không tìm thấy sản phẩm nào với từ khóa "${searchQuery}"`
                      : "Chưa có sản phẩm nào"}
                  </p>
                  
                  {searchQuery && (
                    <>
                      {/* Suggested Keywords */}
                      <div className="mt-6">
                        <p className="text-sm font-medium text-gray-600 mb-3">
                          🤔 Có phải bạn muốn tìm:
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {suggestedKeywords.map((keyword, index) => (
                            <button
                              key={index}
                              onClick={() => navigate(`/san-pham?q=${encodeURIComponent(keyword)}`)}
                              className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full text-sm font-medium transition-colors"
                            >
                              {keyword}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Fallback Products */}
                      {fallbackProducts.length > 0 && (
                        <div className="mt-8">
                          <p className="text-sm font-medium text-gray-600 mb-4">
                            📌 Hoặc xem các sản phẩm nổi bật này:
                          </p>
                          <Row gutter={[16, 16]} className="mt-4">
                            {fallbackProducts.map((product) => (
                              <Col key={product.id} xs={24} sm={12} md={8}>
                                <Link to={`/san-pham/${product.id}`}>
                                  <Card
                                    hoverable
                                    cover={
                                      <div className="relative h-48 bg-gray-100">
                                        <img
                                          alt={product.name}
                                          src={product.imageUrl || product.image_url || 'https://via.placeholder.com/200'}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            e.target.src = 'https://via.placeholder.com/200';
                                          }}
                                        />
                                        {product.isFeatured && (
                                          <Tag color="gold" className="absolute top-2 left-2">
                                            HOT
                                          </Tag>
                                        )}
                </div>
              }
            >
                                    <Meta
                                      title={
                                        <div className="line-clamp-2 text-sm" title={product.name}>
                                          {product.name}
                                        </div>
                                      }
                                      description={
                                        <div className="text-center">
                                          {product.salePrice && product.salePrice < product.price ? (
                                            <>
                                              <span className="text-red-600 font-bold">
                                                {formatPrice(product.salePrice)}
                                              </span>
                                              <br />
                                              <span className="text-gray-400 line-through text-xs">
                                                {formatPrice(product.price)}
                                              </span>
                                            </>
                                          ) : (
                                            <span className="text-blue-600 font-bold">
                                              {formatPrice(product.price)}
                                            </span>
                                          )}
                                        </div>
                                      }
                                    />
                                  </Card>
                                </Link>
                              </Col>
                            ))}
                          </Row>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Back to Home Button */}
                  <div className="mt-6">
              <Link to="/">
                <button className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                  Về trang chủ
                </button>
              </Link>
                  </div>
                </div>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}