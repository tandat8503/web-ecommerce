// src/components/user/UserHeader.jsx
import { useState, useEffect } from "react";
import { Row, Col, Input, Badge, Dropdown, Avatar } from "antd";
import {
  FaShoppingCart,
  FaBars,
  FaHeart,
  FaSignOutAlt,
  FaShoppingBag,FaUser
} from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "@/api/auth";
import { toast } from "react-toastify";

export default function UserHeader() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Kiểm tra user đã đăng nhập chưa
  useEffect(() => {
    const loadUserData = () => {
      console.log("UserHeader loadUserData called");
      const userData = localStorage.getItem("user");
      console.log("UserHeader localStorage user data:", userData);
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          console.log("UserHeader loading user data:", parsedUser);
          console.log("UserHeader avatar URL:", parsedUser.avatar);
          setUser(parsedUser);
        } catch (error) {
          console.error("Error parsing user data:", error);
          localStorage.removeItem("user");
          localStorage.removeItem("token");
        }
      } else {
        console.log("No user data in localStorage");
      }
    };

    // Load user data initially
    loadUserData();

    // Listen for storage changes (when user data is updated from other components)
    const handleStorageChange = (e) => {
      if (e.key === 'user') {
        loadUserData();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom events (for same-tab updates)
    const handleUserUpdate = () => {
      console.log("UserHeader received userUpdated event");
      loadUserData();
    };

    window.addEventListener('userUpdated', handleUserUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userUpdated', handleUserUpdate);
    };
  }, []);

  // Xử lý đăng xuất
  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      
      // Xóa dữ liệu khỏi localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      // Cập nhật state
      setUser(null);
      
      toast.success("👋 Đăng xuất thành công!", {
        position: "top-right",
        autoClose: 2000,
      });
      
      // Chuyển về trang chủ
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("❌ Có lỗi xảy ra khi đăng xuất", {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Menu dropdown cho user đã đăng nhập
  const userMenuItems = [
    {
      key: 'profile-manager',
      label: (
        <Link to="/profile-manager" className="flex items-center gap-2">
          <FaUser className="text-purple-500" />
          Hồ sơ cá nhân
        </Link>
      ),
    },
    // Chỉ hiển thị "Đơn mua" cho user thường, không hiển thị cho admin
    ...(user?.userType !== 'admin' || user?.role !== 'ADMIN' ? [{
      key: 'orders',
      label: (
        <Link to="/orders" className="flex items-center gap-2">
          <FaShoppingBag className="text-green-500" />
          Đơn mua
        </Link>
      ),
    }] : []),
    // Thêm link admin nếu user là admin
    ...(user?.userType === 'admin' && user?.role === 'ADMIN' ? [{
      key: 'admin',
      label: (
        <Link to="/admin" className="flex items-center gap-2">
          <FaUser className="text-blue-500" />
          Quản trị
        </Link>
      ),
    }] : []),
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: (
        <button 
          onClick={handleLogout}
          disabled={loading}
          className="flex items-center gap-2 w-full text-left text-red-500 hover:text-red-700"
        >
          <FaSignOutAlt />
          {loading ? "Đang đăng xuất..." : "Đăng xuất"}
        </button>
      ),
    },
  ];


  return (
    <header className="w-full bg-gradient-to-r from-slate-800 via-blue-800 to-indigo-800 text-white shadow-xl">
  <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-2 text-sm overflow-hidden whitespace-nowrap">
    <marquee behavior="scroll" direction="left" scrollamount="8" className="text-white font-medium">
      🏢 VĂN PHÒNG CHUYÊN NGHIỆP - Đồ dùng văn phòng cao cấp | ✨ Chất lượng Nhật Bản - Giá cả hợp lý | 🚚 Giao hàng miễn phí từ 500k | 📞 Hotline: 1900-xxxx | Mua ngay để có trải nghiệm tuyệt vời!
    </marquee>
  </div>

      {/* --- Header chính --- */}
      <div className="px-4 md:px-6 py-4">
        <Row align="middle" gutter={[16, 16]}>
          {/* Logo */}
          <Col xs={24} md={6}>
            <div className="flex items-center gap-3 justify-start">
              <div className="bg-white rounded-full p-2 shadow-lg">
                <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
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

          {/* Danh mục + search */}
          <Col xs={24} md={12}>
            <div className="flex items-center gap-3">
              <Button className="flex items-center gap-2 bg-white hover:bg-gray-100 text-blue-600 rounded-lg font-medium cursor-pointer shadow-md border-0">
                <FaBars /> Danh mục
              </Button>
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
                // User đã đăng nhập - hiển thị avatar và dropdown
                <Dropdown
                  menu={{ items: userMenuItems }}
                  placement="bottomRight"
                  trigger={['click']}
                  arrow
                >
                  <div className="flex items-center gap-3 cursor-pointer hover:bg-white/10 rounded-lg px-3 py-2 transition-colors">
                    {console.log("UserHeader - user.avatar:", user.avatar, "type:", typeof user.avatar)}
                    <Avatar 
                      size={40} 
                      src={user.avatar && user.avatar !== "" ? user.avatar : "https://res.cloudinary.com/dww6krdpx/image/upload/v1756100724/Avatars/fqzevhnhcnqscw7rpgtx.jpg"}
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
                // User chưa đăng nhập - hiển thị nút đăng nhập
                <Button className="flex items-center gap-2 bg-white hover:bg-gray-100 text-blue-600 rounded-lg font-medium cursor-pointer shadow-md border-0">
                  <Link to="/auth" className="flex items-center gap-2">
                    <FaUser /> Đăng nhập
                  </Link>
                </Button>
              )}

              <div className="relative group">
                <div className="p-2 rounded-full hover:bg-white/20 transition-colors cursor-pointer">
                  <FaHeart style={{ fontSize: 22, color: "white" }} />
                </div>
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  2
                </div>
              </div>

              <div className="relative group">
                <div className="p-2 rounded-full hover:bg-white/20 transition-colors cursor-pointer">
                  <FaShoppingCart style={{ fontSize: 22, color: "white" }} />
                </div>
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  1
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </header>
  );
}
