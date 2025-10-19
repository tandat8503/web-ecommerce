// File cấu hình tất cả các routes cho server
// Tập trung tất cả các routes của ứng dụng web e-commerce

// ==================== IMPORT ROUTES ====================

// Public routes (không cần authentication)
import authRouter from "./authRoutes.js "; // Routes xác thực: login, register, refresh token
import addressRouter from "./addressRouter.js "; // Routes quản lý địa chỉ người dùng
import userRouter from "./user.router.js"; // Routes thông tin người dùng (public)



// Admin routes (yêu cầu authentication và quyền admin)
import adminOrderRoutes from "./adminOrderRoutes.js"; // Routes quản lý đơn hàng
import adminCustomerRoutes from "./adminCustomerRoutes.js"; // Routes quản lý khách hàng
import adminCategoryRoutes from "./adminCategoryRoutes.js"; // Routes quản lý danh mục sản phẩm
import adminProductRoutes from "./adminProductRoutes.js"; // Routes quản lý sản phẩm (CRUD + lấy theo category)
import adminProductImageRoutes from "./adminProductImageRoutes.js"; // Routes quản lý ảnh sản phẩm
import adminBrandRoutes from "./adminBrandRoutes.js"; // Routes quản lý thương hiệu
import adminUserRoutes from "./adminUserRoutes.js"; // Routes quản lý người dùng
import adminBannerRoutes from "./adminBannerRouters.js"; // Routes quản lý banner quảng cáo
import adminProductVariantRoutes from "./adminProductVariantRoutes.js"; // Routes quản lý biến thể sản phẩm
import adminProductSpecificationRoutes from"./adminProductSpecificationRoutes.js"; // Routes quản lý thông số kỹ thuật

/**
 * Function cấu hình tất cả routes cho ứng dụng
 * @param {Express} app - Express application instance
 */
const routes = (app) => {
  // ==================== PUBLIC ROUTES ====================
  // Các routes không yêu cầu authentication
  
  app.use("/api/auth", authRouter); // Authentication endpoints
  app.use("/api/addresses", addressRouter); // Address management endpoints
  app.use("/api/users", userRouter); // User information endpoints (public)
 
  // ==================== USER ROUTES ====================
  // Các routes yêu cầu authentication nhưng không cần quyền admin
  
  //app.use("/api/orders", userOrderRoutes); // User order management endpoints
  
  // ==================== ADMIN ROUTES ====================
  // Tất cả routes admin đều yêu cầu authentication và quyền admin
  
  app.use("/api/admin/categories", adminCategoryRoutes); // Category management
  app.use("/api/admin/products", adminProductRoutes); // Product management (CRUD + get by category)
  app.use("/api/admin/product-images", adminProductImageRoutes); // Product image management
  app.use("/api/admin/brands", adminBrandRoutes); // Brand management
  app.use("/api/admin/orders", adminOrderRoutes); // Order management
  app.use("/api/admin/customers", adminCustomerRoutes); // Customer management
  app.use("/api/admin/users", adminUserRoutes); // User management
  app.use("/api/admin/banners", adminBannerRoutes); // Banner management
  app.use("/api/admin/product-variants", adminProductVariantRoutes); // Product variant management
  app.use("/api/admin/product-specifications", adminProductSpecificationRoutes); // Product specification management
};

export default routes;
