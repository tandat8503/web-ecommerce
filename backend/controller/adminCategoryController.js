import prisma from "../config/prisma.js";
import cloudinary from "../config/cloudinary.js";
import { slugify } from "../utils/slugify.js";
import logger from "../utils/logger.js";
import { emitCategoryCreated, emitCategoryUpdated, emitCategoryDeleted } from "../config/socket.js";

// ============================
// DANH SÁCH CATEGORY
// ============================
export const listCategories = async (req, res) => {
  const context = { path: "admin.categories.list" };
  try {
    logger.start(context.path, { 
      query: req.query,
      user: req.user ? { id: req.user.id, role: req.user.role } : 'No user'
    });
    
    const { page = 1, limit = 10, q, isActive } = req.query;
    
    // Xây dựng điều kiện WHERE
    // Nếu là public route (không có user), chỉ lấy categories active
    const where = {};
    if (q) where.name = { contains: q };
    if (!req.user) {
      where.isActive = true; // Public route chỉ lấy active categories
    } else if (isActive !== undefined) {
      // Admin có thể filter theo isActive nếu muốn (cho dropdown chọn category khi tạo sản phẩm)
      where.isActive = isActive === 'true' || isActive === true;
    }

    logger.debug('Query params', { page, limit, q, where });

    const [items, total] = await Promise.all([
      prisma.category.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.category.count({ where }),
    ]);

    logger.success('Categories fetched', { total, itemsCount: items.length });
    logger.end(context.path, { total, itemsCount: items.length });
    
    const payload = { items, total, page: Number(page), limit: Number(limit) };
    return res.json(payload);
  } catch (error) {
    logger.error('Failed to fetch categories', { 
      path: context.path,
      error: error.message, 
      stack: error.stack 
    });
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
};

// ============================
// LẤY CATEGORY THEO ID
// ============================
export const getCategory = async (req, res) => {
  const context = { path: 'admin.categories.get' };
  try {
    logger.start(context.path, { id: req.params.id });
    
    const id = Number(req.params.id);
    const category = await prisma.category.findUnique({ where: { id } });
    
    if (!category) {
      logger.warn('Category not found', { id });
      return res.status(404).json({ message: "Not found" });
    }
    
    logger.success('Category fetched', { id });
    logger.end(context.path, { id });
    return res.json(category);
  } catch (error) {
    logger.error('Failed to fetch category', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
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
  const context = { path: 'admin.categories.create' };
  try {
    logger.start(context.path, { name: req.body.name });
    
    const { name, isActive } = req.body;
    
    // Validation
    if (!name || !name.trim()) {
      logger.warn('Missing required field: name');
      return res.status(400).json({ message: "Name is required" });
    }
    
    const slug = (req.body.slug?.trim()) || slugify(name);

    // Check slug trùng
    const exists = await prisma.category.findUnique({ where: { slug } });
    if (exists) {
      logger.warn('Slug conflict', { slug, existingId: exists.id });
      return res.status(409).json({ message: "Tên danh mục đã tồn tại" });
    }

    let imageUrl = null;
    let imagePublicId = null;
    if (req.file) {
      imageUrl = req.file.path;
      imagePublicId = req.file.filename;
      logger.debug('Image uploaded', { imageUrl, imagePublicId });
    }

    const created = await prisma.category.create({
      data: {
        name: name.trim(),
        slug,
        imageUrl,
        imagePublicId,
        isActive: isActive === "true" || isActive === true,
      },
    });

    logger.success('Category created', { id: created.id, name: created.name });
    logger.end(context.path, { id: created.id });
    
    // Gửi thông báo real-time đến tất cả client là tạo danh mục mới
    emitCategoryCreated(created);
    
    return res.status(201).json(created);
  } catch (error) {
    logger.error('Failed to create category', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
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
  const context = { path: 'admin.categories.update' };
  try {
    logger.start(context.path, { id: req.params.id, name: req.body.name });
    
    const id = Number(req.params.id);
    const found = await prisma.category.findUnique({ where: { id } });
    if (!found) {
      logger.warn('Category not found', { id });
      return res.status(404).json({ message: "Not found" });
    }

    let { name, slug, isActive } = req.body;

    if (!slug && name) slug = slugify(name);

    // Kiểm tra slug trùng
    if (slug && slug !== found.slug) {
      const duplicate = await prisma.category.findUnique({ where: { slug } });
      if (duplicate) {
        logger.warn('Slug conflict', { slug, existingId: duplicate.id });
        return res.status(409).json({ message: "Slug already exists" });
      }
    }

    // Convert isActive về boolean
    const parsedIsActive =
      isActive === undefined
        ? found.isActive
        : (isActive === "true" || isActive === true);

    let updateData = {
      name: name ? name.trim() : found.name,
      slug: slug ?? found.slug,
      isActive: parsedIsActive,
    };

    // Nếu có ảnh mới
    if (req.file) {
      if (found.imagePublicId) {
        await cloudinary.uploader.destroy(found.imagePublicId, { invalidate: true });
        logger.debug('Old image deleted', { publicId: found.imagePublicId });
      }
      updateData.imageUrl = req.file.path;
      updateData.imagePublicId = req.file.filename;
      logger.debug('New image uploaded', { imageUrl: updateData.imageUrl });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    logger.success('Category updated', { id, name: updated.name });
    logger.end(context.path, { id });
    
    // Gửi thông báo real-time đến tất cả client là cập nhật danh mục
    emitCategoryUpdated(updated);
    
    return res.json(updated);
  } catch (error) {
    logger.error('Failed to update category', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
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
  const context = { path: 'admin.categories.delete' };
  try {
    logger.start(context.path, { id: req.params.id });
    
    const id = Number(req.params.id);
    const found = await prisma.category.findUnique({ where: { id } });
    if (!found) {
      logger.warn('Category not found', { id });
      return res.status(404).json({ message: "Not found" });
    }

    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      logger.warn('Cannot delete category with products', { id, productCount });
      return res.status(400).json({ message: "Cannot delete: category has products" });
    }

    // Xoá ảnh Cloudinary nếu có
    if (found.imagePublicId) {
      await cloudinary.uploader.destroy(found.imagePublicId, { invalidate: true });
      logger.debug('Image deleted', { publicId: found.imagePublicId });
    }

    await prisma.category.delete({ where: { id } });
    
    logger.success('Category deleted', { id, name: found.name });
    logger.end(context.path, { id });
    
    // Gửi thông báo real-time đến tất cả client là xoá danh mục
    emitCategoryDeleted(id);
    
    return res.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete category', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV !== "production" ? error.message : undefined,
    });
  }
};
