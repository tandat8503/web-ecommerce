import { useState, useEffect } from "react";
import { Row, Col, Input, Dropdown, Avatar, Spin } from "antd";
import {
  FaShoppingCart,
  FaBars,
  FaHeart,
  FaSignOutAlt,
  FaShoppingBag,
  FaUser,
} from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "@/api/auth";
import { toast } from "@/lib/utils";
import { getPublicCategories } from "@/api/adminCategories";
import useWishlistStore from "@/stores/wishlistStore";
import useCartStore from "@/stores/cartStore";
import { CartIconButton } from "@/components/user/CartButton";

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
          to={`/category/${cat.slug}`}
          className="block px-4 py-2 text-gray-800 hover:bg-blue-100 hover:text-blue-600 transition-colors text-sm font-medium"
        >
          {cat.name}
        </Link>
      ))}
    </div>
  );
};

/* --------------------------
  Component chính: Header người dùng
--------------------------- */
export default function UserHeader() {
  const [user, setUser] = useState(null);
  const [loadingLogout, setLoadingLogout] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const navigate = useNavigate();
  
  // ========== ZUSTAND - Lấy số lượng wishlist và cart từ Zustand stores ==========
  const { getWishlistCount, resetWishlist } = useWishlistStore();
  const { getCartCount, resetCart } = useCartStore();
  
  // ✅ Subscribe vào store để trigger re-render khi state thay đổi
  const wishlistCount = useWishlistStore((state) => state.items.length);
  const cartCount = useCartStore((state) => state.totalQuantity);

  // Lấy danh mục public
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const res = await getPublicCategories();
        setCategories(res.data.items || []);
      } catch (error) {
        console.error("Lỗi tải danh mục:", error);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // Lấy thông tin user từ localStorage
  useEffect(() => {
    const loadUserData = () => {
      const userData = localStorage.getItem("user");
      if (userData) {
        try {
          setUser(JSON.parse(userData));
        } catch (error) {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
        }
      }
    };

    loadUserData();
    
    // Lắng nghe event userUpdated từ LoginForm/RegisterForm
    const handleUserUpdated = () => {
      loadUserData();
    };
    
    window.addEventListener("userUpdated", handleUserUpdated);
    
    // Cleanup khi component unmount
    return () => {
      window.removeEventListener("userUpdated", handleUserUpdated);
    };
  }, []);

  // Đăng xuất
  const handleLogout = async () => {
    try {
      setLoadingLogout(true);
      // Gọi API logout (không cần await - nếu token hết hạn cũng không sao)
      logout().catch(() => {
        // Bỏ qua lỗi nếu token đã hết hạn - vẫn logout thành công ở frontend
      });
    } catch (error) {
      // Bỏ qua lỗi
    } finally {
      // ✨ QUAN TRỌNG: Luôn clear localStorage và state, bất kể API có thành công hay không
      // Điều này đảm bảo logout luôn thành công ngay cả khi token đã hết hạn
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
      
      // Reset Zustand wishlist và cart state khi logout
      resetWishlist();
      resetCart();
      
      setLoadingLogout(false);
      toast.success("Đăng xuất thành công!");
      navigate("/");
    }
  };

  // Danh sách menu user
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
    <header className="sticky top-0 z-40 w-full bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 text-white shadow-xl">
      {/* Thanh chạy quảng cáo */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-2 text-sm overflow-hidden whitespace-nowrap">
        <marquee
          behavior="scroll"
          direction="left"
          scrollamount="8"
          className="text-white font-medium"
        >
          🏢 VĂN PHÒNG CHUYÊN NGHIỆP - Đồ dùng văn phòng cao cấp | ✨ Chất lượng
          Nhật Bản - Giá hợp lý | 🚚 Giao hàng miễn phí từ 500k | 📞 Hotline:
          1900-xxxx | Mua ngay để có trải nghiệm tuyệt vời!
        </marquee>
      </div>

      {/* Header chính */}
      <div className="px-4 md:px-6 py-4">
        <Row align="middle" gutter={[16, 16]}>
          {/* Logo */}
          <Col xs={24} md={6}>
            <div className="flex items-center gap-3 justify-start">
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
                <span className="font-bold text-xl text-white block leading-tight">
                  OFFICE PRO
                </span>
                <span className="text-xs text-blue-200 block">
                  Văn phòng chuyên nghiệp
                </span>
              </div>
            </div>
          </Col>

          {/* Danh mục + tìm kiếm */}
          <Col xs={24} md={12}>
            <div className="flex items-center gap-3">
             <Dropdown
            dropdownRender={() => (
              <CategoryDropdown
                categories={categories}
                loading={loadingCategories}
              />
            )}
            trigger={["hover"]}     
            placement="bottomLeft"
          >
            <Button className="flex items-center gap-2 bg-white hover:bg-gray-100 text-blue-600 rounded-lg font-medium cursor-pointer shadow-md border-0">
              <FaBars /> Danh mục
            </Button>
          </Dropdown>


              <Input.Search
                placeholder="Tìm kiếm văn phòng phẩm, máy tính, bàn ghế..."
                allowClear
                className="rounded-full shadow-lg flex-1"
                size="large"
              />
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