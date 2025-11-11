import { useState, useEffect } from "react";
import { Layout, Avatar, Popover, Button, Space, Badge, Divider } from "antd";
import { FaSignOutAlt, FaBell } from "react-icons/fa";
import { Typewriter } from "react-simple-typewriter";
import { useNavigate } from "react-router-dom";
import { logout } from "@/api/auth";
import { getUserProfile } from "@/api/userProfile";
import { toast } from "@/lib/utils";
import useCartStore from "@/stores/cartStore";
import useWishlistStore from "@/stores/wishlistStore";
import { NotificationDropdown, useAdminNotifications, useAdminSocket } from "@/pages/admin/notification";

const { Header } = Layout;

const AdminHeader = () => {
  const [loading, setLoading] = useState(false);
  const [adminInfo, setAdminInfo] = useState(null);
  const navigate = useNavigate();
  
  // Get Zustand stores
  const resetCart = useCartStore(state => state.resetCart);
  const resetWishlist = useWishlistStore(state => state.resetWishlist);
  
  // Notifications - Hook quản lý API và state
  const {
    notifications,//danh sách thông báo
    unreadCount,//số lượng thông báo chưa đọc
    loading: notificationsLoading,//loading
    fetchNotifications,      //lấy danh sách thông báo
    fetchUnreadCount,       //lấy số lượng thông báo chưa đọc
    handleMarkAsRead,//đánh dấu đã đọc  
    handleMarkAllAsRead,//đánh dấu tất cả đã đọc
    handleDelete//xóa thông báo
  } = useAdminNotifications();
  
  // ========== WEBSOCKET: LẮNG NGHE ĐƠN HÀNG MỚI ==========
  // Sử dụng hook chung để tránh lặp code
  useAdminSocket((data) => {
    // Hiển thị toast thông báo
    toast.success(`Đơn hàng mới: ${data.orderNumber} - ${data.customerName}`);
    
    // Refresh danh sách thông báo từ server
    setTimeout(() => {
      fetchNotifications();//lấy danh sách thông báo
      fetchUnreadCount();//lấy số lượng thông báo chưa đọc
    }, 500);//delay 500ms để tránh lỗi
  }, [fetchNotifications, fetchUnreadCount]);//khi fetchNotifications hoặc fetchUnreadCount thay đổi, hook sẽ chạy lại
  // ========== END WEBSOCKET: LẮNG NGHE ĐƠN HÀNG MỚI ==========
  
  // Lấy thông tin admin khi component mount
  useEffect(() => {
    const fetchAdminInfo = async () => {
      try {
        const response = await getUserProfile();
        
        // Backend trả về: { code: 200, message: "...", data: { user: {...} } }
        // Nên cần access: response.data.data.user
        const user = response.data?.data?.user || response.data?.user;
        
        setAdminInfo(user);
      } catch (error) {
        console.error(" Error fetching admin info:", error);
      }
    };
    
    fetchAdminInfo();
  }, []);
  
  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      
      // Xóa localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      // Reset cart và wishlist state
      resetCart();
      resetWishlist();
      
      toast.success(" Đăng xuất thành công!");
      navigate("/");
    } catch (error) {
      toast.error(" Có lỗi xảy ra khi đăng xuất");
    } finally {
      setLoading(false);
    }
  };

  // Popover content cho notifications - sử dụng component riêng
  const notificationContent = (
    <NotificationDropdown
      notifications={notifications}//danh sách thông báo
      unreadCount={unreadCount}//số lượng thông báo chưa đọc
      loading={notificationsLoading}//loading
      handleMarkAsRead={handleMarkAsRead}//đánh dấu đã đọc
      handleMarkAllAsRead={handleMarkAllAsRead}//đánh dấu tất cả đã đọc
      handleDelete={handleDelete}//xóa thông báo
    />
  );

  // Popover content cho user menu
  const popoverContent = (
    <div style={{ minWidth: "150px" }}>
      <Divider style={{ margin: "8px 0" }} />
      <Button
        type="text"
        danger
        icon={<FaSignOutAlt />}
        onClick={handleLogout}
        loading={loading}
        block
        style={{ textAlign: "left" }}
      >
        {loading ? "Đang đăng xuất..." : "Đăng xuất"}
      </Button>
    </div>
  );

  return (
    <Header
      style={{
        background: "#fff",
        padding: "0 20px",
        fontWeight: "bold",
        fontSize: "18px",
        color: "#333",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}
    >
      <div>Trang quản trị</div>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Typewriter greeting */}
        <div style={{ fontSize: "16px", fontWeight: "500" }}>
        <span className="gradient-text">
          <Typewriter
            words={[
              "Xin chào, Admin ",
              "Ngày mới vui vẻ ☀️",
              "Chốt đơn mỏi tay 🤲💸",
              "Khách tự tìm tới 📞",
              "Doanh thu vùn vụt ⚡",
              "Tiền về ngập dashboard 💰",
              "Ship hàng tới tối 🚚",
              "Chào mừng quay lại 🚀",
            ]}
            loop
            cursor
            cursorStyle={<span className="cursor-glow">|</span>}
            typeSpeed={80}
            deleteSpeed={50}
            delaySpeed={200}
          />
        </span>
        <span className="bounce" style={{ marginLeft: "8px", fontSize: "28px" }}>
          👋
        </span>

        <style>
          {`
            /* Gradient chữ đổi màu */
            .gradient-text {
              background: linear-gradient(270deg, #1890ff, #ff4d4f, #52c41a, #faad14);
              background-size: 600% 600%;
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              animation: gradientMove 5s ease infinite;
            }
            @keyframes gradientMove {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }

            /* Hiệu ứng tay vẫy */
            .bounce {
              display: inline-block;
              animation: wave 1.5s infinite;
              transform-origin: 70% 70%;
            }
            @keyframes wave {
              0% { transform: rotate(0deg); }
              10% { transform: rotate(14deg); }
              20% { transform: rotate(-8deg); }
              30% { transform: rotate(14deg); }
              40% { transform: rotate(-4deg); }
              50% { transform: rotate(10deg); }
              60%, 100% { transform: rotate(0deg); }
            }

            /* Cursor gõ sáng */
            .cursor-glow {
              display: inline-block;
              animation: glow 1s infinite alternate;
            }
            @keyframes glow {
              from { text-shadow: 0 0 2px #1890ff, 0 0 5px #1890ff; }
              to { text-shadow: 0 0 8px #1890ff, 0 0 15px #40a9ff; }
            }
          `}
        </style>
        </div>

        {/* Notification Bell */}
        <Popover content={notificationContent} placement="bottomRight" trigger="click">
          <Badge count={unreadCount} size="small" offset={[-5, 5]}>
            <Button
              type="text"
              icon={<FaBell style={{ fontSize: 20 }} />}
              style={{ fontSize: 20, color: "#1890ff" }}
            />
          </Badge>
        </Popover>

        {/* Admin Avatar + Logout */}
        <Popover content={popoverContent} placement="bottomRight" trigger="click">
          <Space style={{ cursor: "pointer" }}>
            
            <Avatar 
              // Hiển thị avatar admin nếu có
              src={adminInfo?.avatar}
              style={{ backgroundColor: "#1890ff" }}
              size={40}
            >
              {/* Nếu không có avatar từ backend, hiển thị chữ cái đầu của firstName hoặc email or mặc định A */}
              {adminInfo?.avatar ? null : (adminInfo?.firstName?.[0] || adminInfo?.email?.[0]?.toUpperCase() || 'A')}
            </Avatar>
            <span style={{ color: "#1890ff", fontWeight: 500 }}>
              {/* Hiển thị tên admin  */}
              {adminInfo?.firstName && adminInfo?.lastName 
                // Nếu có tên, hiển thị tên đầy đủ
                ? `${adminInfo.firstName} ${adminInfo.lastName}`
                // Nếu không có tên, hiển thị email hoặc 'Admin'
                : adminInfo?.firstName || adminInfo?.email || 'Admin'
              }
            </span>
          </Space>
        </Popover>
      </div>
    </Header>
  );
};

export default AdminHeader;
