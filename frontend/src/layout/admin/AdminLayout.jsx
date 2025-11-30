import { useState } from "react";
import { Layout } from "antd";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import AdminHeader from "./AdminHeader";
import AdminFooter from "./AdminFooter";
import AdminChatWidget from "@/pages/admin/chatbox/AdminChatWidget";

const { Content } = Layout;

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <Layout>
        <AdminHeader />
        <Content style={{ margin: "16px" }}>
          <div>
            <Outlet />
          </div>
        </Content>
        <AdminChatWidget />
        <AdminFooter />
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
