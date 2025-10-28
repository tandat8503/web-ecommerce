import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartCount
} from "../controller/shoppingCartController.js";
import { 
  addToCartSchema, 
  updateCartItemSchema
} from "../validators/shoppingCart.valid.js";
import { validate } from "../middleware/validate.middleware.js";

const router = express.Router();

// Tất cả routes đều yêu cầu authentication
router.use(authenticateToken);

// Lấy giỏ hàng
router.get("/", getCart);

// Lấy số lượng sản phẩm trong giỏ hàng (cho icon giỏ hàng)
router.get("/count", getCartCount);

// Thêm sản phẩm vào giỏ hàng
router.post("/add", validate(addToCartSchema), addToCart);

// Cập nhật số lượng sản phẩm trong giỏ hàng
router.put("/update/:cartItemId", validate(updateCartItemSchema), updateCartItem);

// Xóa sản phẩm khỏi giỏ hàng
router.delete("/remove/:cartItemId", removeFromCart);

// Xóa tất cả sản phẩm trong giỏ hàng
router.delete("/clear", clearCart);

export default router;