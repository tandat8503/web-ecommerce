import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// Hàm tạo storage động theo folder
const createUpload = (folderName) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: folderName, // phân loại ảnh (avatar, sản phẩm, banner).
      allowed_formats: ["jpg", "png", "jpeg", "webp"],
      transformation: [
        { width: 1000, height: 1000, crop: "limit", quality: "auto" },
      ],
    },
  });

  return multer({ storage });
};

// Các middleware upload tái sử dụng
export const uploadAvatar = createUpload("Avatars");
export const uploadBanner = createUpload("Banners");
export const uploadCategory = createUpload("Categories");
export const uploadProduct = createUpload("Products"); // Thêm mới