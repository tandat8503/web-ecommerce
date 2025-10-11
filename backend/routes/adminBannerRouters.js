import express from "express";
import {
  createBanner,
  getBanners,
  getBannerById,
  updateBanner,
  deleteBanner,
  getActiveBanners,

} from "../controller/adminBannerController.js";
import { uploadBanner } from "../middleware/uploadcloud.js";
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
//  ROUTE PUBLIC (cho user không cần đăng nhập)
router.get("/active", getActiveBanners);// Lấy banner đang hoạt động cho user

router.use(authenticateToken, requireAdmin);
router.post("/", uploadBanner.single("image"), createBanner);
router.get("/", getBanners);
router.get("/:id", getBannerById);
router.put("/:id", uploadBanner.single("image"), updateBanner);
router.delete("/:id", deleteBanner);
export default router;
