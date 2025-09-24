//tất cả các route cho server
import authRouter from "./authRoutes.js ";
import addressRouter from "./addressRouter.js ";
import userRouter from "./user.router.js";
import adminCategoryRoutes from "./adminCategoryRoutes.js";
import adminProductRoutes from "./adminProductRoutes.js";
import adminBrandRoutes from "./adminBrandRoutes.js";

const routes = (app) => {
  app.use("/api/auth", authRouter);
  app.use("/api/addresses", addressRouter);
  app.use("/api/users", userRouter);

  // Admin routes
  app.use("/api/admin/categories", adminCategoryRoutes);
  app.use("/api/admin/products", adminProductRoutes);
  app.use("/api/admin/brands", adminBrandRoutes);
}

export default routes;
