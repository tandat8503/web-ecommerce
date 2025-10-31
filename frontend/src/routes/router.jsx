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
import AdminProductVariant from "@/pages/admin/AdminProductVariant";
import AdminProductSpecification from "@/pages/admin/AdminProductSpecification";
import AdminCoupons from "@/pages/admin/AdminCoupons";
import AdminOrders from "@/pages/admin/AdminOrders";

//User
import UserLayout from "@/layout/user/UserLayout";
import Home from "@/pages/user/Home";
import Products from "@/pages/user/Products";
import ProductDetail from "@/pages/user/ProductDetail";
import Wishlist from "@/pages/user/Wishlist";
import Cart from "@/pages/user/Cart";
import Checkout from "@/pages/user/Checkout";
import OrderSuccess from "@/pages/user/OrderSuccess";
import MyOrders from "@/pages/user/MyOrders";
import OrderDetail from "@/pages/user/OrderDetail";
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
      { path: "san-pham", element: <Products /> },
      { path: "san-pham/:id", element: <ProductDetail /> },
      { path: "wishlist", element: <Wishlist /> },
      { path: "cart", element: <Cart /> },
      { path: "checkout", element: <Checkout /> },
      { path: "order-success", element: <OrderSuccess /> },
      { path: "orders", element: <MyOrders /> },
      { path: "orders/:id", element: <OrderDetail /> },
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
      { path: "product-variants", element: <AdminProductVariant /> },
      { path: "product-specifications", element: <AdminProductSpecification /> },
      { path: "coupons", element: <AdminCoupons /> },
      { path: "orders", element: <AdminOrders /> },
    ],
  },

  // 404 Not Found - phải để cuối cùng
  {
    path: "*",
    element: <NotFound />,
  },
 
]);

export default router;
