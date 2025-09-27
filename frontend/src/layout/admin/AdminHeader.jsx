import { useState } from "react";
import { Layout, Avatar, Dropdown, Menu } from "antd";
import { FaUser, FaSignOutAlt } from "react-icons/fa";
import { Typewriter } from "react-simple-typewriter";
import { useNavigate } from "react-router-dom";
import { logout } from "@/api/auth";
import { toast } from "react-toastify";

const { Header } = Layout;

const AdminHeader = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      
      // Xóa dữ liệu khỏi localStorage
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
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

  const userMenu = (
    <Menu
      items={[
        {
          key: "1",
          icon: <FaSignOutAlt />,
          danger: true,
          label: loading ? "Đang đăng xuất..." : "Đăng xuất",
          onClick: handleLogout,
          disabled: loading,
        },
      ]}
    />
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


        <Dropdown menu={userMenu} placement="bottomRight" arrow>
          <Avatar style={{ backgroundColor: "#1890ff" }} icon={<FaUser />} />
        </Dropdown>
      </div>
    </Header>
  );
};

export default AdminHeader;
