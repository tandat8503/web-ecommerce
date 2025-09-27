// AdminFooter.jsx
import { Layout } from "antd";
const { Footer } = Layout;

const AdminFooter = () => {
  return (
    <Footer
      style={{
        textAlign: "center",
        background: "#fff",
        color: "#888",
        fontWeight: "500",
        borderTop: "1px solid #f0f0f0",
      }}
    >
      © {new Date().getFullYear()} Admin Panel. All rights reserved
    </Footer>
  );
};

export default AdminFooter;
