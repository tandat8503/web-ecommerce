import express from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
} from "../controller/adminUserController.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();
// Áp dụng middleware xác thực + quyền admin
router.use(authenticateToken, requireAdmin);

router.get("/", getUsers);
router.get("/:id", getUserById);
router.post("/", createUser);
router.put("/:id", updateUser);
export default router;
