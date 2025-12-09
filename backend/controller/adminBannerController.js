import prisma from "../config/prisma.js";
import cloudinary from "../config/cloudinary.js";
import logger from '../utils/logger.js';
import { emitBannerCreated, emitBannerUpdated, emitBannerDeleted } from '../config/socket.js';

// ============================
// TẠO BANNER
// ============================
export const createBanner = async (req, res) => {
  try {
    const { title, isActive } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng upload ảnh banner" });
    }

    const banner = await prisma.banner.create({
      data: {
        title,
        isActive: isActive === "true",
        imageUrl: req.file.path,
        bannerPublicId: req.file.filename,
      },
    });

    // ✅ Socket: Gửi thông báo banner mới → User thấy ngay trên slider (không cần reload)
    emitBannerCreated(banner);

    res.json({ code: 200, message: "Tạo banner thành công", data: banner });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error });
  }
};

// ============================
// LẤY DANH SÁCH BANNER CHO ADMIN
// ============================
export const getBanners = async (req, res) => {
  try {
    const banners = await prisma.banner.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ code: 200, data: banners });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error });
  }
};


// ============================
// LẤY DANH SÁCH BANNER HOẠT ĐỘNG (CHO USER)
// ============================
export const getActiveBanners = async (req, res) => {
  try {
    const banners = await prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ code: 200, data: banners });
  } catch (error) {
    logger.error('Failed to fetch active banners', { error: error.message, stack: error.stack });
    res.status(500).json({ message: "Lỗi server", error });
  }
};


// ============================
// LẤY 1 BANNER
// ============================
export const getBannerById = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await prisma.banner.findUnique({ where: { id: Number(id) } });

    if (!banner) return res.status(404).json({ message: "Không tìm thấy banner" });

    res.json({ code: 200, data: banner });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error });
  }
};

// ============================
// CẬP NHẬT BANNER
// ============================
export const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, isActive } = req.body;

    const banner = await prisma.banner.findUnique({ where: { id: Number(id) } });
    if (!banner) return res.status(404).json({ message: "Không tìm thấy banner" });

    let updateData = {
      title,
      isActive: isActive !== undefined ? isActive === "true" : banner.isActive,
    };

    // Nếu upload ảnh mới thì xóa ảnh cũ trên Cloudinary
    if (req.file) {
      if (banner.bannerPublicId) {
        await cloudinary.uploader.destroy(banner.bannerPublicId, { invalidate: true });
      }
      updateData.imageUrl = req.file.path;
      updateData.bannerPublicId = req.file.filename;
    }

    const updatedBanner = await prisma.banner.update({
      where: { id: Number(id) },
      data: updateData,
    });

    // ✅ Socket: Gửi thông báo banner cập nhật → User thấy thay đổi ngay (hoặc banner bị ẩn nếu tắt)
    emitBannerUpdated(updatedBanner);

    res.json({ code: 200, message: "Cập nhật banner thành công", data: updatedBanner });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error });
  }
};

// ============================
// XÓA BANNER
// ============================
export const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await prisma.banner.findUnique({ where: { id: Number(id) } });

    if (!banner) return res.status(404).json({ message: "Không tìm thấy banner" });

    // Xóa ảnh trên Cloudinary
    if (banner.bannerPublicId) {
      await cloudinary.uploader.destroy(banner.bannerPublicId , { invalidate: true });
    }

    await prisma.banner.delete({ where: { id: Number(id) } });

    // ✅ Socket: Gửi thông báo banner xóa → User không thấy banner đó nữa trên slider
    emitBannerDeleted(Number(id));

    res.json({ code: 200, message: "Xóa banner thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error });
  }
};

