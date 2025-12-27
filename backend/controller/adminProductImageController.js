import prisma from '../config/prisma.js';
import cloudinary from '../config/cloudinary.js';
import logger from '../utils/logger.js';

// ============================
// ✅ LẤY DANH SÁCH ẢNH SẢN PHẨM
// 🔄 TỰ ĐỘNG DETECT: Public (không token) hoặc Admin (có token)
// ============================
export const getProductImages = async (req, res) => {
  // 🔑 BƯỚC 1: Detect public/admin dựa vào req.user
  const isPublicRoute = !req.user;
  
  const context = { 
    path: isPublicRoute ? 'public.productImages.list' : 'admin.productImages.list'
  };
  
  try {
    logger.start(context.path, { productId: req.params.productId, isPublicRoute });
    
    const productId = Number(req.params.productId);
    
    // 🔑 BƯỚC 2: Public và Admin đều xem tất cả ảnh (không filter)
    // Product images không cần filter theo isActive, chỉ cần thuộc product đó
    const images = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' }
    });

    logger.success('Product images fetched', { productId, count: images.length, isPublicRoute });
    logger.end(context.path, { productId, count: images.length });
    return res.json({ items: images, total: images.length });
  } catch (error) {
    logger.error('Failed to fetch product images', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined 
    });
  }
};

// ============================
// ✅ LẤY CHI TIẾT 1 ẢNH
// 🔄 TỰ ĐỘNG DETECT: Public (không token) hoặc Admin (có token)
// ============================
export const getProductImage = async (req, res) => {
  // 🔑 BƯỚC 1: Detect public/admin dựa vào req.user
  const isPublicRoute = !req.user;
  
  const context = { 
    path: isPublicRoute ? 'public.productImages.get' : 'admin.productImages.get'
  };
  
  try {
    logger.start(context.path, { id: req.params.id, isPublicRoute });
    
    const id = Number(req.params.id);
    
    // 🔑 BƯỚC 2: Public và Admin đều xem tất cả ảnh (không filter)
    const image = await prisma.productImage.findUnique({ where: { id } });
    if (!image) {
      logger.warn('Product image not found', { id, isPublicRoute });
      return res.status(404).json({ message: 'Image not found' });
    }

    logger.success('Product image fetched', { id, isPublicRoute });
    logger.end(context.path, { id });
    return res.json(image);
  } catch (error) {
    logger.error('Failed to fetch product image', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined 
    });
  }
};

// ============================
// TẠO ẢNH SẢN PHẨM
// ============================
export const createProductImage = async (req, res) => {
  const context = { path: 'admin.productImages.create' };
  try {
    logger.start(context.path, { productId: req.params.productId });
    
    const productId = Number(req.params.productId);
    const { isPrimary, sortOrder } = req.body;

    // Kiểm tra sản phẩm tồn tại
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      logger.warn('Product not found', { productId });
      return res.status(404).json({ message: 'Product not found' });
    }

    if (!req.file) {
      logger.warn('No file uploaded');
      return res.status(400).json({ message: 'Image file is required' });
    }

    // Nếu set làm ảnh chính, bỏ primary của các ảnh khác
    if (isPrimary === 'true' || isPrimary === true) {
      await prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false }
      });
    }

    const image = await prisma.productImage.create({
      data: {
        productId,
        imageUrl: req.file.path,
        imagePublicId: req.file.filename,
        isPrimary: isPrimary === 'true' || isPrimary === true,
        sortOrder: Number(sortOrder) || 0
      }
    });

    logger.debug('Image uploaded', { imageUrl: image.imageUrl, imagePublicId: image.imagePublicId });
    logger.success('Product image created', { id: image.id, productId });
    logger.end(context.path, { id: image.id });
    return res.status(201).json(image);
  } catch (error) {
    logger.error('Failed to create product image', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined 
    });
  }
};

// ============================
// CẬP NHẬT ẢNH SẢN PHẨM
// ============================
export const updateProductImage = async (req, res) => {
  const context = { path: 'admin.productImages.update' };
  try {
    logger.start(context.path, { id: req.params.id });
    
    const id = Number(req.params.id);
    
    const found = await prisma.productImage.findUnique({ where: { id } });
    if (!found) {
      logger.warn('Product image not found', { id });
      return res.status(404).json({ message: 'Image not found' });
    }

    const { isPrimary, sortOrder } = req.body;
    const updateData = {};

    // Nếu set làm ảnh chính, bỏ primary của các ảnh khác
    if (isPrimary === 'true' || isPrimary === true) {
      await prisma.productImage.updateMany({
        where: { 
          productId: found.productId,
          id: { not: id }
        },
        data: { isPrimary: false }
      });
      updateData.isPrimary = true;
    } else if (isPrimary === 'false' || isPrimary === false) {
      updateData.isPrimary = false;
    }

    if (sortOrder !== undefined) {
      updateData.sortOrder = Number(sortOrder);
    }

    // Nếu có ảnh mới
    if (req.file) {
      // Xóa ảnh cũ (wrap trong try-catch để không block việc update)
      if (found.imagePublicId) {
        try {
          await cloudinary.uploader.destroy(found.imagePublicId, { invalidate: true });
          logger.debug('Old image deleted', { publicId: found.imagePublicId });
        } catch (cloudError) {
          logger.warn('Failed to delete old image from Cloudinary', { 
            publicId: found.imagePublicId, 
            error: cloudError.message,
            imageId: id
          });
          // Tiếp tục update dù lỗi Cloudinary
        }
      }
      updateData.imageUrl = req.file.path;
      updateData.imagePublicId = req.file.filename;
      logger.debug('New image uploaded', { imageUrl: updateData.imageUrl });
    }

    const updated = await prisma.productImage.update({
      where: { id },
      data: updateData
    });

    logger.success('Product image updated', { id: updated.id });
    logger.end(context.path, { id: updated.id });
    return res.json(updated);
  } catch (error) {
    logger.error('Failed to update product image', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined 
    });
  }
};

// ============================
// XÓA ẢNH SẢN PHẨM
// ============================
export const deleteProductImage = async (req, res) => {
  const context = { path: 'admin.productImages.delete' };
  try {
    logger.start(context.path, { id: req.params.id });
    
    const id = Number(req.params.id);
    
    const found = await prisma.productImage.findUnique({ where: { id } });
    if (!found) {
      logger.warn('Product image not found', { id });
      return res.status(404).json({ message: 'Image not found' });
    }

    // Xóa ảnh khỏi Cloudinary (wrap trong try-catch để không block việc xóa trong DB)
    if (found.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(found.imagePublicId, { invalidate: true });
        logger.debug('Image deleted from Cloudinary', { publicId: found.imagePublicId });
      } catch (cloudError) {
        // Log lỗi nhưng vẫn tiếp tục xóa trong DB để tránh dữ liệu không nhất quán
        logger.warn('Failed to delete image from Cloudinary', { 
          publicId: found.imagePublicId, 
          error: cloudError.message,
          imageId: id
        });
        // Tiếp tục xóa trong DB dù lỗi Cloudinary
      }
    }

    await prisma.productImage.delete({ where: { id } });

    logger.success('Product image deleted', { id });
    logger.end(context.path, { id });
    return res.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete product image', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined 
    });
  }
};

// ============================
// SET ẢNH CHÍNH
// ============================
export const setPrimaryImage = async (req, res) => {
  const context = { path: 'admin.productImages.setPrimary' };
  try {
    logger.start(context.path, { productId: req.params.productId, imageId: req.body.imageId });
    
    const productId = Number(req.params.productId);
    const { imageId } = req.body;
    
    if (!imageId) {
      logger.warn('Missing imageId');
      return res.status(400).json({ message: 'imageId is required' });
    }
    
    const found = await prisma.productImage.findUnique({ 
      where: { 
        id: Number(imageId),
        productId: productId
      } 
    });
    if (!found) {
      logger.warn('Product image not found', { imageId, productId });
      return res.status(404).json({ message: 'Image not found' });
    }

    // Bỏ primary của tất cả ảnh khác
    await prisma.productImage.updateMany({
      where: { 
        productId: productId,
        id: { not: Number(imageId) }
      },
      data: { isPrimary: false }
    });

    // Set ảnh này làm primary
    const updated = await prisma.productImage.update({
      where: { id: Number(imageId) },
      data: { isPrimary: true }
    });

    logger.success('Primary image set', { imageId: updated.id, productId });
    logger.end(context.path, { imageId: updated.id, productId });
    return res.json(updated);
  } catch (error) {
    logger.error('Failed to set primary image', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined 
    });
  }
};

// ============================
// SẮP XẾP LẠI THỨ TỰ ẢNH
// ============================
export const reorderImages = async (req, res) => {
  const context = { path: 'admin.productImages.reorder' };
  try {
    logger.start(context.path, { productId: req.params.productId, count: req.body.imageOrders?.length });
    
    const productId = Number(req.params.productId);
    const { imageOrders } = req.body; // [{ id: 1, sortOrder: 0 }, { id: 2, sortOrder: 1 }]

    if (!Array.isArray(imageOrders)) {
      logger.warn('Invalid imageOrders format');
      return res.status(400).json({ message: 'imageOrders must be an array' });
    }

    // Cập nhật thứ tự cho từng ảnh
    const updatePromises = imageOrders.map(({ id, sortOrder }) =>
      prisma.productImage.update({
        where: { id: Number(id) },
        data: { sortOrder: Number(sortOrder) }
      })
    );

    await Promise.all(updatePromises);

    logger.success('Images reordered', { productId, updatedCount: imageOrders.length });
    logger.end(context.path, { productId, updatedCount: imageOrders.length });
    return res.json({ success: true, updatedCount: imageOrders.length });
  } catch (error) {
    logger.error('Failed to reorder images', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined 
    });
  }
};
