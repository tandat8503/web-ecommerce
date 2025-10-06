//tất cả các route cho server
import authRouter from "./authRoutes.js ";
import addressRouter from "./addressRouter.js ";
import userRouter from "./user.router.js";
import adminOrderRoutes from "./adminOrderRoutes.js";
import adminCustomerRoutes from "./adminCustomerRoutes.js";


import adminCategoryRoutes from "./adminCategoryRoutes.js";
import adminProductRoutes from "./adminProductRoutes.js";
import adminBrandRoutes from "./adminBrandRoutes.js";
import adminUserRoutes from "./adminUserRoutes.js";
import adminBannerRoutes from "./adminBannerRouters.js"; 
import adminProductVariantRoutes from "./adminProductVariantRoutes.js";
import adminProductSpecificationRoutes from"./adminProductSpecificationRoutes.js";


const routes = (app) => {
  app.use("/api/auth", authRouter);
  app.use("/api/addresses", addressRouter);
  app.use("/api/users", userRouter);
 
  // Admin routes
  app.use("/api/admin/categories", adminCategoryRoutes);
  app.use("/api/admin/products", adminProductRoutes);
  app.use("/api/admin/brands", adminBrandRoutes);
  app.use("/api/admin/orders", adminOrderRoutes);
  app.use("/api/admin/customers", adminCustomerRoutes);
  app.use("/api/admin/users", adminUserRoutes);
  app.use("/api/admin/banners", adminBannerRoutes); 
  app.use("/api/admin/product-variants", adminProductVariantRoutes);
  app.use("/api/admin/product-specifications", adminProductSpecificationRoutes);
};

export default routes;
