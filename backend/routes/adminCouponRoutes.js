import express from "express";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";
import { validate } from "../middleware/validate.middleware.js";
import { createCouponSchema, updateCouponSchema } from "../validators/coupon.valid.js";
import {
  createCoupon,
  getCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon
} from "../controller/adminCouponController.js";

const router = express.Router();

// Tất cả routes đều yêu cầu authentication
router.use(authenticateToken, requireAdmin);

// CRUD Coupon routes
router.post("/", validate(createCouponSchema), createCoupon);//thêm mã giảm giá
router.get("/", getCoupons);//lấy danh sách mã giảm giá
router.get("/:id", getCouponById);//lấy mã giảm giá theo id
router.put("/:id",validate(updateCouponSchema), updateCoupon);//cập nhật mã giảm giá
router.delete("/:id", deleteCoupon);//xóa mã giảm giá

export default router;
