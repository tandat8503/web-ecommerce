import { useState } from "react";
import { Layout } from "antd";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import AdminHeader from "./AdminHeader";
import AdminFooter from "./AdminFooter";
import ChatWidget from "@/pages/user/chatbox/ChatWidget";

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
        <ChatWidget />
        <AdminFooter />
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
