//tất cả các route cho server
import authRouter from "./authRoutes.js ";
import addressRouter from "./addressRouter.js ";
import userRouter from "./user.router.js";

const routes = (app) => {
  app.use("/api/auth", authRouter);
  app.use("/api/addresses", addressRouter);
  app.use("/api/users", userRouter);
}

export default routes;
