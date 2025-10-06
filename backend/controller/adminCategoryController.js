import prisma from "../config/prisma.js";
import cloudinary from "../config/cloudinary.js";
import { slugify } from "../utils/slugify.js";

// ============================
// DANH SÁCH CATEGORY
// ============================
export const listCategories = async (req, res) => {
  const context = { path: "admin.categories.list", query: req.query };
  try {
    const { page = 1, limit = 10, q } = req.query;
    const where = q ? { name: { contains: q, mode: "insensitive" } } : undefined;

    const [items, total] = await Promise.all([
      prisma.category.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.category.count({ where }),
    ]);

    const payload = { items, total, page: Number(page), limit: Number(limit) };
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
};

// ============================
// LẤY CATEGORY THEO ID
// ============================
export const getCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) return res.status(404).json({ message: "Not found" });
    return res.json(category);
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
};

// ============================
// TẠO CATEGORY
// ============================
export const createCategory = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    const slug = (req.body.slug?.trim()) || slugify(name);

    // Check slug trùng
    const exists = await prisma.category.findUnique({ where: { slug } });
    if (exists) {
      return res.status(409).json({ message: "Slug already exists" });
    }

    let imageUrl = null;
    let imagePublicId = null;
    if (req.file) {
      imageUrl = req.file.path;
      imagePublicId = req.file.filename;
      console.log('Image uploaded to Cloudinary:', { imageUrl, imagePublicId });
    }

    const created = await prisma.category.create({
      data: {
        name,
        slug,
        description: description || null,
        imageUrl,
        imagePublicId,
        isActive: isActive === "true",
      },
    });

    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
};

// ============================
// CẬP NHẬT CATEGORY
// ============================
export const updateCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const found = await prisma.category.findUnique({ where: { id } });
    if (!found) return res.status(404).json({ message: "Not found" });

    let { name, slug, description, isActive } = req.body;

    if (!slug && name) slug = slugify(name);

    // Kiểm tra slug trùng
    if (slug && slug !== found.slug) {
      const duplicate = await prisma.category.findUnique({ where: { slug } });
      if (duplicate) {
        return res.status(409).json({ message: "Slug already exists" });
      }
    }

    // Convert isActive về boolean
    const parsedIsActive =
      isActive === undefined
        ? found.isActive
        : (isActive === "true" || isActive === true);

    let updateData = {
      name: name ?? found.name,
      slug: slug ?? found.slug,
      description: description === undefined ? found.description : description,
      isActive: parsedIsActive,
    };

    // Nếu có ảnh mới
    if (req.file) {
      if (found.imagePublicId) {
        await cloudinary.uploader.destroy(found.imagePublicId, { invalidate: true });
        console.log('Old image deleted from Cloudinary:', found.imagePublicId);
      }
      updateData.imageUrl = req.file.path;
      updateData.imagePublicId = req.file.filename;
      console.log('New image uploaded to Cloudinary:', { imageUrl: updateData.imageUrl, imagePublicId: updateData.imagePublicId });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
};


// ============================
// XOÁ CATEGORY
// ============================
export const deleteCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const found = await prisma.category.findUnique({ where: { id } });
    if (!found) return res.status(404).json({ message: "Not found" });

    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return res.status(400).json({ message: "Cannot delete: category has products" });
    }

    // Xoá ảnh Cloudinary nếu có
    if (found.imagePublicId) {
      await cloudinary.uploader.destroy(found.imagePublicId, { invalidate: true });
      console.log('Image deleted from Cloudinary:', found.imagePublicId);
    }

    await prisma.category.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
};
