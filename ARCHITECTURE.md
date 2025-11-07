## Web E-commerce – Feature Map and Workflows

This document maps each major feature to the relevant files and describes the end-to-end workflow: Frontend UI → API client → Backend routes/controllers/middleware → Prisma models → Result.

Notes
- File paths are relative to the repo root.
- Auth-protected admin endpoints require JWT via `Authorization` header, handled by `frontend/src/api/axiosClient.js` and backend `backend/middleware/auth.js`.

### Core Platform
- Backend server and wiring
  - Backend: `backend/server.js`, `backend/routes/index.js`, `backend/middleware/auth.js`, `backend/config/prisma.js`
  - Prisma schema: `backend/prisma/schema.prisma`
  - Workflow: FE request → CORS check (server.js) → optional `authenticateToken` + `requireAdmin` → route/controller → Prisma DB → response

- CORS & Health
  - Backend: `backend/server.js` (CORS allow origins and methods incl. PATCH), `GET /api/health`
  - FE: `frontend/src/api/axiosClient.js` (global client)
  - Workflow: Preflight OPTIONS → allow methods/headers/origins → normal request continues

### Authentication
- Frontend
  - Token injection: `frontend/src/api/axiosClient.js`
  - Route guard: `frontend/src/routes/ProtectedRoute.jsx`
- Backend
  - Middleware: `backend/middleware/auth.js`
  - (Auth routes file may exist if enabled)
- Prisma: `User`
- Workflow: Login → receive JWT → FE attaches JWT to requests → BE verifies → proceed

### User Profile & Addresses
- Frontend
  - UI: `frontend/src/pages/user/profile/ProfileManager.jsx`
- API Client
  - Uses `frontend/src/api/axiosClient.js` to call `api/addresses/...`
- Backend
  - Routes: `backend/routes/addressRoutes.js`
  - Controller: `backend/controller/addressController.js`
- Prisma: `Address` (relates to `User`)
- Workflow: CRUD address → controller validate → Prisma write → UI refresh

### Categories (Admin)
- Frontend: `frontend/src/pages/admin/AdminCategories.jsx`
- API Client: `frontend/src/api/adminCategories.js`
- Backend: `backend/routes/adminCategoryRoutes.js`, `backend/controller/adminCategoryController.js`
- Prisma: `Category`
- Workflow: Admin CRUD → DB → refresh list/options

### Brands (Admin)
- Frontend: `frontend/src/pages/admin/AdminBrands.jsx`
- API Client: `frontend/src/api/adminBrands.js`
- Backend: `backend/routes/adminBrandRoutes.js`, `backend/controller/adminBrandController.js`
- Prisma: `Brand`
- Workflow: Admin CRUD → DB → refresh list/options

### Products (Admin + Public)
- Frontend
  - Admin UI: `frontend/src/pages/admin/AdminProducts.jsx`
  - User List: `frontend/src/pages/user/Products.jsx`
  - User Detail: `frontend/src/pages/user/ProductDetail.jsx`
  - Cards: `frontend/src/components/user/ProductCard.jsx`
- API Client
  - Admin: `frontend/src/api/adminProducts.js`
  - Public: `frontend/src/api/publicProducts.js`
- Backend
  - Routes: `backend/routes/adminProductRoutes.js`
  - Controller: `backend/controller/adminProductController.js`
- Prisma: `Product` (relations: `Category`, `Brand`, `ProductImage`, `ProductVariant`)
- Workflow: Admin CRUD product → Prisma → Admin list updates; User pages consume public endpoints

### Product Images (Admin + Public read)
- Frontend
  - Integrated modal (opened from AdminProducts): `frontend/src/pages/admin/ProductImageModal.jsx`
  - Note: there is no standalone AdminProductImages page; image management lives in the modal.
- API Client: `frontend/src/api/adminProductImages.js`
- Backend
  - Routes: `backend/routes/adminProductImageRoutes.js`
    - Public read: `GET /api/product-images/public/:productId`, `GET /api/product-images/public/image/:id`
    - Admin manage: `GET /api/admin/product-images/:productId`, `POST /api/admin/product-images/:productId`, `PUT /api/admin/product-images/:id`, `DELETE /api/admin/product-images/:id`, `PATCH /api/admin/product-images/:productId/set-primary`, `PATCH /api/admin/product-images/:productId/reorder`
  - Controller: `backend/controller/adminProductImageController.js`
- Prisma: `ProductImage` (+ mirrors to `Product.imageUrl` as the primary image)
- Workflow
  1) Upload → `POST /api/admin/product-images/:productId` (first upload can be primary)
  2) Set primary → `PATCH /api/admin/product-images/:productId/set-primary`
  3) Reorder → `PATCH /api/admin/product-images/:productId/reorder`
  4) Sync to product main image → `PATCH /api/admin/products/:id/primary-image`
  5) Modal triggers `onImageUpdated` → `AdminProducts` calls `fetchProducts()` → table reflects changes
  6) Public product detail uses public image routes for gallery

### Product Variants (Admin + Public read)
- Frontend
  - Admin UI: `frontend/src/pages/admin/AdminProductVariant.jsx`
  - User Detail consumption: `frontend/src/pages/user/ProductDetail.jsx`
- API Client: `frontend/src/api/adminProductVariants.js`, `frontend/src/api/publicProductVariants.js`
- Backend: `backend/routes/adminProductVariantRoutes.js`, `backend/controller/adminProductVariantController.js`
- Prisma: `ProductVariant`
- Workflow: Admin CRUD variants → User detail uses variants for price/stock/selection

### Product Specifications (Admin)
- Frontend: `frontend/src/pages/admin/AdminProductSpecification.jsx`
- API Client: `frontend/src/api/adminProductSpecifications.js`
- Backend: `backend/routes/adminProductSpecificationRoutes.js`, `backend/controller/adminProductSpecificationController.js`
- Prisma: `ProductSpecification`
- Workflow: Admin CRUD → shown on product detail

### Coupons (Admin)
- Frontend: `frontend/src/pages/admin/AdminCoupons.jsx`
- API Client: `frontend/src/api/adminCoupons.js`
- Backend: `backend/routes/adminCouponRoutes.js`, `backend/controller/adminCouponController.js`
- Prisma: `Coupon`
- Workflow: Admin CRUD → applied during checkout (if wired)

### Banners (Admin + Public)
- Frontend: `frontend/src/pages/admin/AdminBanner.jsx` (admin), banner display on `frontend/src/pages/user/Home.jsx`
- API Client: `frontend/src/api/adminBanners.js`
- Backend: `backend/routes/adminBannerRoutes.js`, `backend/controller/adminBannerController.js`
- Prisma: `Banner`
- Workflow: Admin CRUD → Home fetch banners

### Orders (Admin + User)
- Frontend
  - Admin: `frontend/src/pages/admin/AdminOrders.jsx`
  - User: `frontend/src/pages/user/MyOrders.jsx`, `frontend/src/pages/user/OrderDetail.jsx`
- API Client: `frontend/src/api/adminOrders.js`, `frontend/src/api/orders.js`
- Backend: `backend/routes/adminOrderRoutes.js`, `backend/controller/adminOrderController.js`
- Prisma: `Order`, `OrderItem` (+ relations: `User`, `ProductVariant`)
- Workflow: Place order → items persisted and stock rules applied → Admin updates status → User views history/detail

### Cart (User)
- Frontend: `frontend/src/pages/user/Cart.jsx`, Zustand store `frontend/src/store/cartStore.js`
- API Client: `frontend/src/api/cart.js`
- Backend: `backend/routes/shoppingCartRoutes.js`, `backend/controller/shoppingCartController.js`
- Prisma: `ShoppingCart`
- Workflow: Add/update/remove items → server validates and persists → store updates totals

### Wishlist (User)
- Frontend: `frontend/src/pages/user/Wishlist.jsx`, Zustand store `frontend/src/store/wishlistStore.js`
- API Client: `frontend/src/api/wishlist.js`
- Backend: `backend/routes/wishlistRouter.js`, `backend/controller/wishlistController.js`
- Prisma: `Wishlist`
- Workflow: Toggle wishlist (auth) → Prisma persists → FE list/count re-render

### Home & Featured Products (Public)
- Frontend: `frontend/src/pages/user/Home.jsx`, `frontend/src/components/user/ProductCard.jsx`
- API Client: `frontend/src/api/publicProducts.js`
- Backend: public product endpoints in `backend/controller/adminProductController.js`
- Prisma: `Product.isFeatured`
- Workflow: FE fetches featured products → renders cards

### Admin Dashboard
- Frontend: `frontend/src/pages/admin/Dashboard.jsx`
- API Client: `frontend/src/api/adminDashboard.js` (if present)
- Backend: aggregated queries (commonly within controllers)
- Prisma: multiple models aggregated
- Workflow: FE loads stats → BE aggregates → charts/totals

### AI Chatbot (Optional)
- Frontend: `frontend/src/api/aiChatbotAPI.js`, `frontend/src/pages/user/chatbox/ChatWidget.jsx`, `frontend/src/pages/admin/chatbox/AdminChatWidget.jsx`
- AI Service (Python/FastAPI): `ai/` (e.g., `ai/main.py`, `ai/app.py`)
- Workflow: FE health check (optional) + WebSocket → if service not running, FE suppresses errors and continues

---

## Cross-Cutting Flows

### Image Management Sync (Admin)
- Trigger points: `ProductImageModal.jsx` actions (upload, set primary, reorder, delete)
- API calls
  - Upload: `POST /api/admin/product-images/:productId`
  - Set primary: `PATCH /api/admin/product-images/:productId/set-primary`
  - Reorder: `PATCH /api/admin/product-images/:productId/reorder`
  - Sync product main image: `PATCH /api/admin/products/:id/primary-image`
- Outcome: `Product.imageUrl` always reflects the current primary image; Admin product list refreshes

### AuthN/AuthZ Middleware
- `backend/middleware/auth.js`
  - `authenticateToken`: validates JWT, loads user from DB
  - `requireAdmin`: ensures `req.user.role === 'ADMIN'`
- Applied on admin routes via `router.use(authenticateToken, requireAdmin)`

### Public vs Admin APIs
- Public (no token): product listing/detail, product images (public routes inside `adminProductImageRoutes.js`)
- Admin (token required): CRUD on products, images, variants, specs, banners, coupons, categories, brands, orders
- User-authenticated (token required): addresses, cart, wishlist, profile endpoints

---

## File Reference Index (by area)

- Frontend API Core: `frontend/src/api/axiosClient.js`
- Admin
  - Products: `frontend/src/pages/admin/AdminProducts.jsx`
  - Variants: `frontend/src/pages/admin/AdminProductVariant.jsx`
  - Specifications: `frontend/src/pages/admin/AdminProductSpecification.jsx`
  - Images (integrated modal): `frontend/src/pages/admin/ProductImageModal.jsx`
  - Categories: `frontend/src/pages/admin/AdminCategories.jsx`
  - Brands: `frontend/src/pages/admin/AdminBrands.jsx`
  - Banners: `frontend/src/pages/admin/AdminBanner.jsx`
  - Coupons: `frontend/src/pages/admin/AdminCoupons.jsx`
  - Orders: `frontend/src/pages/admin/AdminOrders.jsx`
  - Dashboard: `frontend/src/pages/admin/Dashboard.jsx`
- User
  - Home: `frontend/src/pages/user/Home.jsx`
  - Products: `frontend/src/pages/user/Products.jsx`
  - Product Detail: `frontend/src/pages/user/ProductDetail.jsx`
  - Wishlist: `frontend/src/pages/user/Wishlist.jsx`
  - Cart: `frontend/src/pages/user/Cart.jsx`
  - Orders: `frontend/src/pages/user/MyOrders.jsx`, `frontend/src/pages/user/OrderDetail.jsx`
  - Profile: `frontend/src/pages/user/profile/ProfileManager.jsx`
- Backend Controllers (selected)
  - Products: `backend/controller/adminProductController.js`
  - Product Images: `backend/controller/adminProductImageController.js`
  - Variants: `backend/controller/adminProductVariantController.js`
  - Specifications: `backend/controller/adminProductSpecificationController.js`
  - Categories: `backend/controller/adminCategoryController.js`
  - Brands: `backend/controller/adminBrandController.js`
  - Orders: `backend/controller/adminOrderController.js`
  - Coupons: `backend/controller/adminCouponController.js`
  - Addresses: `backend/controller/addressController.js`
- Backend Routes (selected)
  - `backend/routes/adminProductRoutes.js`
  - `backend/routes/adminProductImageRoutes.js` (includes public image routes)
  - `backend/routes/adminProductVariantRoutes.js`
  - `backend/routes/adminProductSpecificationRoutes.js`
  - `backend/routes/adminCategoryRoutes.js`
  - `backend/routes/adminBrandRoutes.js`
  - `backend/routes/adminOrderRoutes.js`
  - `backend/routes/adminCouponRoutes.js`


