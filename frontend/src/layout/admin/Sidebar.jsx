import { Layout, Menu } from "antd";
import {
  FaHome,
  FaChevronLeft,
  FaChevronRight,
  FaList,
  FaUsers,
  FaTrademark,
  FaShoppingCart,
  FaBoxOpen,
  FaShapes,
  FaImage,
  FaPhotoVideo,
  FaTicketAlt
} from "react-icons/fa";
import { Link, useLocation } from "react-router-dom";

const { Sider } = Layout;

const Sidebar = ({ collapsed, setCollapsed }) => {
  const location = useLocation();

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      trigger={null}
      width={220}
      style={{
        background: "#fff",
        borderRight: "1px solid #f0f0f0",
        position: "relative",
      }}
    >
      {/* Logo */}
      <div
        className="text-center py-4 font-bold text-lg"
        style={{
          color: "#1890ff",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        {collapsed ? "AP" : "Admin Panel"}
      </div>

      {/* Menu */}
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        style={{ background: "transparent", fontWeight: 500 }}
        items={[
          {
            key: "/admin",
            icon: <FaHome />,
            label: <Link to="/admin">Trang chủ</Link>,
          },
          {
            key: "/admin/users",
            icon: <FaUsers />,
            label: <Link to="/admin/users">Quản lý người dùng</Link>,
          },
          {
            key: "/admin/categories",
            icon: <FaList />,
            label: <Link to="/admin/categories">Quản lý danh mục</Link>,
          },
          {
            key: "/admin/brands",
            icon: <FaTrademark />,
            label: <Link to="/admin/brands">Quản lý thương hiệu</Link>,
          },
          {
            key: "/admin/orders",
            icon: <FaShoppingCart />,
            label: <Link to="/admin/orders">Quản lý đơn hàng</Link>,
          },
          {
            key: "/admin/products",
            icon: <FaBoxOpen />,
            label: <Link to="/admin/products">Quản lý sản phẩm</Link>,
          },
          {
            key: "/admin/product-variants",
            icon: <FaShapes />,
            label: <Link to="/admin/product-variants">Quản lý biến thể</Link>,
          },
          {
            key: "/admin/product-specifications",
            icon: <FaList />,
            label: <Link to="/admin/product-specifications">Quản lý thông số sản phẩm</Link>,
          },
          {
            key: "/admin/product-images",
            icon: <FaImage />,
            label: <Link to="/admin/product-images">Quản lý hình ảnh</Link>,
          },
          {
            key: "/admin/banners",
            icon: <FaPhotoVideo />,
            label: <Link to="/admin/banners">Quản lý banner</Link>,
          },
          {
            key: "/admin/coupons",
            icon: <FaTicketAlt />,
            label: <Link to="/admin/coupons">Quản lý mã giảm giá</Link>,
          },
          
        ]}
      />

      {/* Nút thu gọn */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: "absolute",
          bottom: 20,
          left: collapsed ? "50%" : "85%",
          transform: "translateX(-50%)",
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "#1890ff",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
          transition: "all 0.3s ease",
        }}
      >
        {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
      </div>
    </Sider>
  );
};

export default Sidebar;
