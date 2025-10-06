import { createBrowserRouter} from "react-router-dom";
//Admin
import AdminLayout from "@/layout/admin/AdminLayout";
import Dashboard from "@/pages/admin/Dashboard";
import AdminUser from "@/pages/admin/AdminUser";
import AdminBanner from "@/pages/admin/AdminBanner";
import AdminCategories from "@/pages/admin/AdminCategories";
import AdminBrands from "@/pages/admin/AdminBrands";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminProductImages from "@/pages/admin/AdminProductImages";

//User
import UserLayout from "@/layout/user/UserLayout";
import Home from "@/pages/user/Home";
import ProfileManager from "@/pages/user/profile/ProfileManager";
import AuthPage from "@/pages/auth/AuthPage";
import NotFound from "@/pages/P404/NotFound";

//Components
import ProtectedRoute from "@/routes/ProtectedRoute";


const router = createBrowserRouter([

  {
    path: "/",
    element: <UserLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "profile-manager", element: <ProfileManager /> },
    ],
  },

  // Route auth (không có layout)
  {
    path: "/auth",
    element: <AuthPage />,
  },

 
  // Route admin với layout (chỉ admin mới vào được)
  {
    path: "/admin",
    element: (
      <ProtectedRoute requireAdmin={true}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> }, // Default page khi /admin
      { path: "users", element: <AdminUser /> },
      { path: "banners", element: <AdminBanner /> },
      { path: "categories", element: <AdminCategories /> },
      { path: "brands", element: <AdminBrands /> },
      { path: "products", element: <AdminProducts /> },
      { path: "product-images", element: <AdminProductImages /> },
    ],
  },

  // 404 Not Found - phải để cuối cùng
  {
    path: "*",
    element: <NotFound />,
  },
 
]);

export default router;
