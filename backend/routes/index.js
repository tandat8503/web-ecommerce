//tất cả các route cho server
import authRouter from "./authRoutes.js ";
import addressRouter from "./addressRouter.js ";

const routes = (app) => {
  app.use("/api/auth", authRouter);
  app.use("/api/addresses", addressRouter);
}

export default routes;
