import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  validateCoupon,
  getAvailableCoupons,
  getUserCouponHistory
} from "../controller/couponController.js";

const router = express.Router();

// Tất cả routes đều yêu cầu authentication
router.use(authenticateToken);

// User coupon routes
router.post("/validate", validateCoupon);
router.get("/available", getAvailableCoupons);
router.get("/history", getUserCouponHistory);

export default router;
