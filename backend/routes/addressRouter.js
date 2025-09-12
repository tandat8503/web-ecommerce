import express from "express";
import { authenticateToken } from "../middleware/auth.js"; 
import {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  getDefaultAddress,
  getAddressById,
  setDefaultAddress
} from "../controller/addressController.js";
import { addressSchema } from "../validators/address.valid.js";
import { validate } from "../middleware/validate.middleware.js";

const router = express.Router();

// Sử dụng middleware authenticateToken
router.get("/", authenticateToken, getAddresses);// Lấy danh sách all địa chỉ(mặc định lên đầu)
router.get("/default", authenticateToken, getDefaultAddress);//lấy địa chỉ mặc định
router.get("/:id", authenticateToken, getAddressById);// Lấy chi tiết địa chỉ theo ID
router.post("/", authenticateToken, validate(addressSchema), addAddress);// Thêm địa chỉ mới
router.put("/:id", authenticateToken,  updateAddress);// Cập nhật địa chỉ
router.put("/:id/set-default", authenticateToken, setDefaultAddress);// Đặt địa chỉ mặc định
router.delete("/:id", authenticateToken, deleteAddress);// Xóa địa chỉ


export default router;
