import { useState, useEffect, useRef } from "react";
import { Row, Col, Input, Dropdown, Avatar, Spin } from "antd";
import {
  FaBars,
  FaHeart,
  FaUser,
  FaShoppingBag,
  FaSignOutAlt,
  FaHistory,
  FaTimes,
  FaSearch,
} from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { CartIconButton } from "@/components/user/CartButton";
import { useUserHeader } from "./useUserHeader";
import { getPublicProducts } from "@/api/adminProducts";

/* --------------------------
  Utility: Quản lý Search History trong localStorage
--------------------------- */
const SEARCH_HISTORY_KEY = 'office_pro_search_history';
const MAX_HISTORY_ITEMS = 10;

const getSearchHistory = () => {
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error reading search history:', error);
    return [];
  }
};

const addToSearchHistory = (query) => {
  if (!query || !query.trim()) return;

  try {
    let history = getSearchHistory();

    // Xóa query cũ nếu đã tồn tại (để đưa lên đầu)
    history = history.filter(item => item.toLowerCase() !== query.toLowerCase());

    // Thêm query mới vào đầu
    history.unshift(query.trim());

    // Giới hạn 10 items
    if (history.length > MAX_HISTORY_ITEMS) {
      history = history.slice(0, MAX_HISTORY_ITEMS);
    }

    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving search history:', error);
  }
};

const removeFromSearchHistory = (query) => {
  try {
    let history = getSearchHistory();
    history = history.filter(item => item !== query);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Error removing from search history:', error);
  }
};

const clearSearchHistory = () => {
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch (error) {
    console.error('Error clearing search history:', error);
  }
};

/* --------------------------
  Component con: Dropdown hiển thị tên danh mục
--------------------------- */
const CategoryDropdown = ({ categories, loading }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-6 w-[250px]">
        <Spin />
      </div>
    );
  }

  if (!categories.length) {
    return (
      <div className="p-4 text-gray-500 text-center w-[250px]">
        Không có danh mục
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-2xl border w-[250px] py-2">
      {categories.map((cat) => (
        <Link
          key={cat.id}
          to={`/danh-muc/${cat.slug}`}
          className="block px-4 py-2.5 text-black hover:!bg-blue-100 hover:font-semibold transition-all duration-200 ease-in-out text-sm font-medium rounded-md mx-1 relative group no-underline"
        >
          <span className="relative z-10 text-black">{cat.name}</span>
          {/* Thanh màu xanh bên trái  */}
          <span className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></span>
        </Link>
      ))}
    </div>
  );
};

/* --------------------------
  Component con: Search History Dropdown
--------------------------- */
const SearchHistoryDropdown = ({ history, onSelect, onRemove, onClear, visible }) => {
  if (!visible || history.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl border z-[120] max-h-80 overflow-y-auto">
      <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
        <div className="flex items-center gap-2 text-gray-700 font-medium">
          <FaHistory className="text-blue-500" />
          <span className="text-sm">Lịch sử tìm kiếm</span>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-red-500 hover:text-red-700 hover:underline"
        >
          Xóa tất cả
        </button>
      </div>

      <div className="py-1">
        {history.map((query, index) => (
          <div
            key={index}
            className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 cursor-pointer group"
            onClick={() => onSelect(query)}
          >
            <div className="flex items-center gap-3 flex-1">
              <FaHistory className="text-gray-400 text-sm" />
              <span className="text-gray-700 text-sm">{query}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(query);
              }}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
            >
              <FaTimes className="text-xs" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

/* --------------------------
  Component con: Search Suggestions Dropdown (Autocomplete)
--------------------------- */
const SearchSuggestionsDropdown = ({
  suggestions,
  loading,
  visible,
  onSelectProduct,
  onViewAll,
  searchQuery
}) => {
  if (!visible) return null;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl border z-[120] max-h-96 overflow-y-auto">
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <Spin size="small" />
          <span className="ml-2 text-gray-500 text-sm">Đang tìm kiếm...</span>
        </div>
      ) : suggestions.length > 0 ? (
        <>
          <div className="p-2 border-b bg-gray-50">
            <span className="text-xs text-gray-600 font-medium px-2">Gợi ý sản phẩm</span>
          </div>

          <div className="py-1">
            {suggestions.map((product) => (
              <div
                key={product.id}
                onClick={() => onSelectProduct(product)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 group"
              >
                <img
                  src={product.imageUrl || product.image_url || 'https://via.placeholder.com/60'}
                  alt={product.name}
                  className="w-14 h-14 object-cover rounded border"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/60';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 line-clamp-2 group-hover:text-blue-600">
                    {product.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {product.salePrice && product.salePrice < product.price ? (
                      <>
                        <span className="text-red-600 font-bold text-sm">
                          {formatPrice(product.salePrice)}
                        </span>
                        <span className="text-gray-400 line-through text-xs">
                          {formatPrice(product.price)}
                        </span>
                      </>
                    ) : (
                      <span className="text-blue-600 font-bold text-sm">
                        {formatPrice(product.price)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onViewAll}
            className="w-full p-3 text-center text-blue-600 hover:bg-blue-50 font-medium text-sm border-t"
          >
            <FaSearch className="inline mr-2" />
            Xem tất cả kết quả cho "{searchQuery}"
          </button>
        </>
      ) : (
        <div className="p-6 text-center text-gray-500">
          <p className="text-sm">Không tìm thấy sản phẩm phù hợp</p>
        </div>
      )}
    </div>
  );
};

/* --------------------------
  Component chính: Header người dùng
--------------------------- */
export default function UserHeader() {
  // Lấy tất cả state và handlers từ custom hook
  const {
    user,
    loadingLogout,
    categories,
    loadingCategories,
    wishlistCount,
    handleLogout
  } = useUserHeader();

  // State cho search (không có trong hook vì chỉ dùng ở component này)
  const [searchValue, setSearchValue] = useState("");
  const [searchHistory, setSearchHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const searchWrapperRef = useRef(null);
  const navigate = useNavigate();

  // Load search history khi component mount
  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  // Click outside để đóng history dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
        setShowHistory(false);
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce search suggestions (500ms)
  useEffect(() => {
    // Nếu không có search value, clear suggestions
    if (!searchValue || searchValue.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    const timer = setTimeout(async () => {
      try {
        const response = await getPublicProducts({
          q: searchValue.trim(),
          limit: 5,
          page: 1
        });

        setSuggestions(response.data?.items || []);
        setShowSuggestions(true);
        setShowHistory(false); // Ẩn history khi có suggestions
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchValue]);

  // Handle search submit
  const handleSearch = (value) => {
    const trimmedValue = value?.trim();

    if (trimmedValue) {
      // Lưu vào history
      addToSearchHistory(trimmedValue);
      setSearchHistory(getSearchHistory());

      // Navigate
      navigate(`/san-pham?q=${encodeURIComponent(trimmedValue)}`);
    } else {
      navigate("/san-pham");
    }

    setSearchValue("");
    setShowHistory(false);
    setShowSuggestions(false);
  };

  // Handle select from history
  const handleSelectHistory = (query) => {
    setSearchValue(query);
    handleSearch(query);
  };

  // Handle remove from history
  const handleRemoveHistory = (query) => {
    removeFromSearchHistory(query);
    setSearchHistory(getSearchHistory());
  };

  // Handle clear all history
  const handleClearHistory = () => {
    clearSearchHistory();
    setSearchHistory([]);
    setShowHistory(false);
  };

  // Handle select product from suggestions
  const handleSelectProduct = (product) => {
    // Luôn ưu tiên dùng product.id (API public nhận ID số)
    const targetId = product?.id ?? product?.productId;

    if (!targetId) {
      console.warn("Không tìm thấy ID sản phẩm trong kết quả search", product);
      return;
    }

    // Có thể đính kèm slug dưới dạng query để giữ SEO nếu cần
    const slugSuffix = product.slug ? `?slug=${product.slug}` : "";

    navigate(`/san-pham/${targetId}${slugSuffix}`);
    setSearchValue("");
    setShowSuggestions(false);
  };

  // Handle view all results from suggestions
  const handleViewAllSuggestions = () => {
    handleSearch(searchValue);
  };

  // Tạo danh sách menu user dựa trên role
  // - Admin: Hiển thị link "Quản trị"
  // - User: Hiển thị link "Đơn mua"
  // - Tất cả: Hiển thị "Hồ sơ cá nhân" và "Đăng xuất"
  const userMenuItems = [
    {
      key: "profile-manager",
      label: (
        <Link to="/profile-manager" className="flex items-center gap-2">
          <FaUser className="text-purple-500" />
          Hồ sơ cá nhân
        </Link>
      ),
    },
    ...(user?.role !== 'ADMIN'
      ? [
        {
          key: "orders",
          label: (
            <Link to="/orders" className="flex items-center gap-2">
              <FaShoppingBag className="text-green-500" />
              Đơn mua
            </Link>
          ),
        },
        {
          key: "coupons",
          label: (
            <Link to="/my-coupons" className="flex items-center gap-2">
              <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V6z" />
              </svg>
              Mã giảm giá
            </Link>
          ),
        },
      ]
      : []),
    ...(user?.role === 'ADMIN'
      ? [
        {
          key: "admin",
          label: (
            <Link to="/admin" className="flex items-center gap-2">
              <FaUser className="text-blue-500" />
              Quản trị
            </Link>
          ),
        },
      ]
      : []),
    { type: "divider" },
    {
      key: "logout",
      label: (
        <button
          onClick={handleLogout}
          disabled={loadingLogout}
          className="flex items-center gap-2 w-full text-left text-red-500 hover:text-red-700 cursor-pointer"
        >
          <FaSignOutAlt />
          {loadingLogout ? "Đang đăng xuất..." : "Đăng xuất"}
        </button>
      ),
    },
  ];

  return (
    <header className="sticky top-0 z-[130] w-full bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 text-white shadow-xl">
      {/* Thanh chạy quảng cáo */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-2 text-sm overflow-hidden whitespace-nowrap">
        <marquee
          behavior="scroll"
          direction="left"
          scrollamount="8"
          className="text-white font-medium"
        >
          NỘI THẤT VĂN PHÒNG - Đồ dùng văn phòng cao cấp |  Chất lượng
          Nhật Bản - Giá hợp lý  |  Hotline:
          1900 146398 | Mua ngay để có trải nghiệm tuyệt vời!
        </marquee>
      </div>

      {/* Header chính */}
      <div className="px-4 md:px-6 py-4">
        <Row align="middle" gutter={[16, 16]}>
          {/* Logo */}
          <Col xs={24} md={6}>
            <Link to="/" className="flex items-center gap-3 justify-start hover:opacity-80 transition-opacity">
              <div className="bg-white rounded-full p-2 shadow-lg">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
                </svg>
              </div>
              <div>
                <span className="font-bold text-xl text-white block leading-tight uppercase">
                  Nội thất văn phòng
                </span>
                <span className="text-xs text-blue-200 block">
                  Nội thất văn phòng chất lượng
                </span>
              </div>
            </Link>
          </Col>

          {/* Danh mục + tìm kiếm */}
          <Col xs={24} md={12}>
            <div className="flex items-center gap-3">
              <Dropdown
                popupRender={() => (
                  <CategoryDropdown
                    categories={categories}
                    loading={loadingCategories}
                  />
                )}
                trigger={["hover"]}
                placement="bottomLeft"
              >
                <Button className="flex items-center gap-2 bg-white hover:bg-gray-100 text-indigo-600 rounded-lg font-medium cursor-pointer shadow-md border-0">
                  <FaBars /> Danh mục
                </Button>
              </Dropdown>

              {/* Search box với History & Suggestions */}
              <div ref={searchWrapperRef} className="relative flex-1 z-[110]">
                <Input.Search
                  placeholder="Tìm kiếm sản phẩm "
                  allowClear
                  className="rounded-full shadow-lg"
                  size="large"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onFocus={() => {
                    // Chỉ show history khi không có search value
                    if (!searchValue && searchHistory.length > 0) {
                      setShowHistory(true);
                    }
                  }}
                  onSearch={handleSearch}
                  enterButton
                  loading={loadingSuggestions}
                />

                {/* Search History Dropdown */}
                <SearchHistoryDropdown
                  history={searchHistory}
                  visible={showHistory && !searchValue}
                  onSelect={handleSelectHistory}
                  onRemove={handleRemoveHistory}
                  onClear={handleClearHistory}
                />

                {/* Search Suggestions Dropdown (Autocomplete) */}
                <SearchSuggestionsDropdown
                  suggestions={suggestions}
                  loading={loadingSuggestions}
                  visible={showSuggestions && searchValue.trim().length >= 2}
                  onSelectProduct={handleSelectProduct}
                  onViewAll={handleViewAllSuggestions}
                  searchQuery={searchValue}
                />
              </div>
            </div>
          </Col>

          {/* User actions */}
          <Col xs={24} md={6}>
            <div className="flex justify-end items-center gap-4">
              {user ? (
                <Dropdown
                  menu={{ items: userMenuItems }}
                  placement="bottomRight"
                  trigger={["click"]}
                  arrow
                >
                  <div className="flex items-center gap-3 cursor-pointer hover:bg-white/10 rounded-lg px-3 py-2 transition-colors">
                    <Avatar
                      size={40}
                      src={
                        user.avatar && user.avatar !== ""
                          ? user.avatar
                          : "https://res.cloudinary.com/dww6krdpx/image/upload/v1756100724/Avatars/fqzevhnhcnqscw7rpgtx.jpg"
                      }
                      className="border-2 border-white/30"
                    />
                    <div className="hidden md:block">
                      <div className="text-white font-medium text-sm">
                        {user.firstName} {user.lastName}
                      </div>
                    </div>
                  </div>
                </Dropdown>
              ) : (
                <Button className="flex items-center gap-2 bg-white hover:bg-gray-100 text-blue-600 rounded-lg font-medium cursor-pointer shadow-md border-0">
                  <Link to="/auth" className="flex items-center gap-2">
                    <FaUser /> Đăng nhập
                  </Link>
                </Button>
              )}

              {/* Icon yêu thích */}
              <Link to="/wishlist" className="relative group">
                <div className="p-2 rounded-full hover:bg-white/20 transition-colors cursor-pointer">
                  <FaHeart style={{ fontSize: 22, color: "white" }} />
                </div>
                {/* Badge số lượng wishlist */}
                {wishlistCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                    {wishlistCount}
                  </div>
                )}
              </Link>

              {/* Icon giỏ hàng */}
              <Link to="/cart">
                <CartIconButton className="text-white cursor-pointer " />
              </Link>
            </div>
          </Col>
        </Row>
      </div>
    </header>
  );
}