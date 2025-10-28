import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlistStatus,
  clearWishlist,
  getWishlistCount
} from "../controller/wishlistController.js";
import { addToWishlistSchema, productIdParamSchema } from "../validators/wishlist.valid.js";
import { validate } from "../middleware/validate.middleware.js";

const router = express.Router();

// Tất cả routes đều yêu cầu authentication
router.use(authenticateToken);

// Lấy danh sách sản phẩm yêu thích
router.get("/", getWishlist);

// Lấy số lượng sản phẩm trong wishlist
router.get("/count", getWishlistCount);

// Kiểm tra sản phẩm có trong wishlist không
router.get("/check/:productId", validate(productIdParamSchema, "params"), checkWishlistStatus);

// Thêm sản phẩm vào wishlist
router.post("/", validate(addToWishlistSchema), addToWishlist);

// Xóa sản phẩm khỏi wishlist
router.delete("/:productId", validate(productIdParamSchema, "params"), removeFromWishlist);

// Xóa tất cả sản phẩm khỏi wishlist
router.delete("/", clearWishlist);

export default router;
