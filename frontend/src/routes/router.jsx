import { createBrowserRouter} from "react-router-dom";
//Admin
import AdminLayout from "@/layout/admin/AdminLayout";
import Dashboard from "@/pages/admin/Dashboard";
import AdminUser from "@/pages/admin/user/AdminUser";
import AdminBanner from "@/pages/admin/banner/AdminBanner";
import AdminCategories from "@/pages/admin/category/AdminCategories";
import AdminBrands from "@/pages/admin/brand/AdminBrands";
import AdminProducts from "@/pages/admin/product/AdminProducts";
import AdminProductVariant from "@/pages/admin/product-variant/AdminProductVariant";
import AdminCoupons from "@/pages/admin/coupon/AdminCoupons";
import AdminOrders from "@/pages/admin/order/AdminOrders";

//User
import UserLayout from "@/layout/user/UserLayout";
import Home from "@/pages/user/Home";
import ProductDetail from "@/pages/user/ProductDetail/index";
import ProductsPage from "@/pages/user/ProductPage";
import CategoryPage from "@/pages/user/CategoryPage";
import Wishlist from "@/pages/user/wishlist/Wishlist";
import Cart from "@/pages/user/cart/Cart";
import Checkout from "@/pages/user/checkout/Checkout";
import OrderSuccess from "@/pages/user/OrderSuccess";
import PaymentResult from "@/pages/user/PaymentResult";
import MyOrders from "@/pages/user/orders/MyOrders";
import OrderDetail from "@/pages/user/orders/OrderDetail";
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
      { path: "san-pham", element: <ProductsPage /> },
      { path: "san-pham/:id", element: <ProductDetail /> },
      { path: "danh-muc/:slug", element: <CategoryPage /> },
      { path: "wishlist", element: <Wishlist /> },
      { path: "cart", element: <Cart /> },
      { path: "checkout", element: <Checkout /> },
      { path: "order-success", element: <OrderSuccess /> },
      { path: "payment/result", element: <PaymentResult /> },
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
      { path: "product-variants", element: <AdminProductVariant /> },
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
