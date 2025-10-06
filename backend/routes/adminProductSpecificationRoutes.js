import express from "express";
import {
  getAllSpecifications,
  getSpecificationById,
  createSpecification,
  updateSpecification,
  deleteSpecification,
} from "../controller/AdminProductSpecificationController.js";

const router = express.Router();

// 1. Lấy toàn bộ danh sách
router.get("/", getAllSpecifications);

// 2. Lấy thông số kỹ thuật theo ID
router.get("/:id", getSpecificationById);

// 3. Thêm mới thông số kỹ thuật
router.post("/", createSpecification);

// 4. Cập nhật thông số kỹ thuật theo ID
router.put("/:id", updateSpecification);

// 5. Xóa thông số kỹ thuật theo ID
router.delete("/:id", deleteSpecification);

export default router;
