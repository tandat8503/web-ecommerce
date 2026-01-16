// File cấu hình tất cả các routes cho server
// Tập trung tất cả các routes của ứng dụng web e-commerce

// ==================== IMPORT ROUTES ====================

// Public routes (không cần authentication)
import authRouter from "./authRoutes.js"; // Routes xác thực: login, register, refresh token
import addressRouter from "./addressRouter.js"; // Routes quản lý địa chỉ người dùng
import userRouter from "./user.router.js"; // Routes thông tin người dùng (public)
import wishlistRouter from "./wishlistRouter.js"; // Routes quản lý danh sách yêu thích
import shoppingCartRouter from "./shoppingCartRoutes.js"; // Routes quản lý giỏ hàng
import orderRouter from "./orderRoutes.js"; // Routes quản lý đơn hàng
import paymentRouter from "./paymentRoutes.js"; // Routes thanh toán



// Admin routes (yêu cầu authentication và quyền admin)
import adminOrderRoutes from "./adminOrderRoutes.js"; // Routes quản lý đơn hàng
import adminCategoryRoutes from "./adminCategoryRoutes.js"; // Routes quản lý danh mục sản phẩm
import adminProductRoutes from "./adminProductRoutes.js"; // Routes quản lý sản phẩm (CRUD + lấy theo category)
import adminProductImageRoutes from "./adminProductImageRoutes.js"; // Routes quản lý ảnh sản phẩm
import adminBrandRoutes from "./adminBrandRoutes.js"; // Routes quản lý thương hiệu
import adminUserRoutes from "./adminUserRoutes.js"; // Routes quản lý người dùng
import adminBannerRoutes from "./adminBannerRouters.js"; // Routes quản lý banner quảng cáo
import adminProductVariantRoutes from "./adminProductVariantRoutes.js"; // Routes quản lý biến thể sản phẩm
import adminCouponRoutes from "./adminCouponRoutes.js"; // Routes quản lý mã giảm giá (admin)
import notificationRoutes from "./notificationRoutes.js"; // Routes quản lý thông báo
import productCommentRoutes from "./productCommentRoutes.js"; // Routes bình luận sản phẩm
import productReviewRoutes from "./productReviewRoutes.js"; // Routes đánh giá sản phẩm
import ghnRoutes from "./ghnRoutes.js"; // Routes GHN API (lấy địa chỉ & tính phí vận chuyển)
import adminCouponManagementRoutes from "./adminCouponManagementRoutes.js"; // Routes quản lý khuyến mãi (admin)
import couponRoutes from "./couponRoutes.js"; // Routes quản lý mã giảm giá người dùng
import chatbotRoutes from "./chatbotRoutes.js"; // Routes AI Chatbot (v2)

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
  app.use("/api/wishlist", wishlistRouter); // Wishlist management endpoints
  app.use("/api/cart", shoppingCartRouter); // Shopping cart management endpoints
  app.use("/api/orders", orderRouter); // Order management endpoints
  app.use("/api/payment", paymentRouter); // Payment endpoints
  app.use("/api/notifications", notificationRoutes); // Notification endpoints
  app.use("/api/products", adminProductRoutes); // Product endpoints (public + admin)
  app.use("/api/product-variants", adminProductVariantRoutes); // Product variant endpoints (public + admin)
  app.use("/api/product-images", adminProductImageRoutes); // Product image endpoints (public + admin)
  app.use("/api/product-comments", productCommentRoutes); // Product comment endpoints (public + user + admin)
  app.use("/api/product-reviews", productReviewRoutes); // Product review endpoints (public + user + admin)
  app.use("/api/ghn", ghnRoutes); // GHN API endpoints (lấy địa chỉ & tính phí vận chuyển)

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
  app.use("/api/admin/users", adminUserRoutes); // User management
  app.use("/api/admin/banners", adminBannerRoutes); // Banner management
  app.use("/api/admin/product-variants", adminProductVariantRoutes); // Product variant management
  app.use("/api/admin/coupons", adminCouponRoutes); // Coupon management (old system)
  app.use("/api/admin/coupon-management", adminCouponManagementRoutes); // Coupon management (new system)

  // ==================== USER COUPON ROUTES ====================
  app.use("/api/coupons", couponRoutes); // User coupon endpoints

  // ==================== AI CHATBOT ROUTES ====================
  app.use("/api/chatbot", chatbotRoutes); // AI Chatbot v2 endpoints
};

export default routes;
