import prisma from '../config/prisma.js';
import cloudinary from '../config/cloudinary.js';

// ============================
// ✅ LẤY DANH SÁCH ẢNH SẢN PHẨM
// 🔄 TỰ ĐỘNG DETECT: Public (không token) hoặc Admin (có token)
// ============================
export const getProductImages = async (req, res) => {
  // 🔑 BƯỚC 1: Detect public/admin dựa vào req.user
  const isPublicRoute = !req.user;
  
  const context = { 
    path: isPublicRoute ? 'public.productImages.list' : 'admin.productImages.list', 
    params: req.params 
  };
  
  try {
    console.log(isPublicRoute ? '🌐 START PUBLIC API' : '🔒 START ADMIN API', context);
    const productId = Number(req.params.productId);
    
    // 🔑 BƯỚC 2: Public và Admin đều xem tất cả ảnh (không filter)
    // Product images không cần filter theo isActive, chỉ cần thuộc product đó
    const images = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' }
    });

    console.log(isPublicRoute ? '✅ END PUBLIC API' : '✅ END ADMIN API', { ...context, count: images.length });
    return res.json({ items: images, total: images.length });
  } catch (error) {
    console.error('❌ ERROR', { ...context, error: error.message });
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
    path: isPublicRoute ? 'public.productImages.get' : 'admin.productImages.get', 
    params: req.params 
  };
  
  try {
    console.log(isPublicRoute ? '🌐 START PUBLIC API' : '🔒 START ADMIN API', context);
    const id = Number(req.params.id);
    
    // 🔑 BƯỚC 2: Public và Admin đều xem tất cả ảnh (không filter)
    const image = await prisma.productImage.findUnique({ where: { id } });
    if (!image) {
      console.warn('NOT_FOUND', context);
      return res.status(404).json({ message: 'Image not found' });
    }

    console.log(isPublicRoute ? '✅ END PUBLIC API' : '✅ END ADMIN API', context);
    return res.json(image);
  } catch (error) {
    console.error('❌ ERROR', { ...context, error: error.message });
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
  const context = { path: 'admin.productImages.create', params: req.params, body: req.body };
  try {
    console.log('START', context);
    const productId = Number(req.params.productId);
    const { isPrimary, sortOrder } = req.body;

    // Kiểm tra sản phẩm tồn tại
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      console.warn('PRODUCT_NOT_FOUND', { ...context, productId });
      return res.status(404).json({ message: 'Product not found' });
    }

    if (!req.file) {
      console.warn('NO_FILE', context);
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

    console.log('Image uploaded to Cloudinary:', { imageUrl: image.imageUrl, imagePublicId: image.imagePublicId });
    console.log('END', { ...context, id: image.id });
    return res.status(201).json(image);
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
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
  const context = { path: 'admin.productImages.update', params: req.params, body: req.body };
  try {
    console.log('START', context);
    const id = Number(req.params.id);
    
    const found = await prisma.productImage.findUnique({ where: { id } });
    if (!found) {
      console.warn('NOT_FOUND', context);
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
      // Xóa ảnh cũ
      if (found.imagePublicId) {
        await cloudinary.uploader.destroy(found.imagePublicId, { invalidate: true });
        console.log('Old image deleted from Cloudinary:', found.imagePublicId);
      }
      updateData.imageUrl = req.file.path;
      updateData.imagePublicId = req.file.filename;
      console.log('New image uploaded to Cloudinary:', { imageUrl: updateData.imageUrl, imagePublicId: updateData.imagePublicId });
    }

    const updated = await prisma.productImage.update({
      where: { id },
      data: updateData
    });

    console.log('END', { ...context, id: updated.id });
    return res.json(updated);
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
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
  const context = { path: 'admin.productImages.delete', params: req.params };
  try {
    console.log('START', context);
    const id = Number(req.params.id);
    
    const found = await prisma.productImage.findUnique({ where: { id } });
    if (!found) {
      console.warn('NOT_FOUND', context);
      return res.status(404).json({ message: 'Image not found' });
    }

    // Xóa ảnh khỏi Cloudinary
    if (found.imagePublicId) {
      await cloudinary.uploader.destroy(found.imagePublicId, { invalidate: true });
      console.log('Image deleted from Cloudinary:', found.imagePublicId);
    }

    await prisma.productImage.delete({ where: { id } });

    console.log('END', context);
    return res.json({ success: true });
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
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
  const context = { path: 'admin.productImages.setPrimary', params: req.params, body: req.body };
  try {
    console.log('START', context);
    const productId = Number(req.params.productId);
    const { imageId } = req.body;
    
    if (!imageId) {
      console.warn('MISSING_IMAGE_ID', context);
      return res.status(400).json({ message: 'imageId is required' });
    }
    
    const found = await prisma.productImage.findUnique({ 
      where: { 
        id: Number(imageId),
        productId: productId
      } 
    });
    if (!found) {
      console.warn('NOT_FOUND', context);
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

    console.log('END', { ...context, imageId: updated.id, productId });
    return res.json(updated);
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
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
  const context = { path: 'admin.productImages.reorder', params: req.params, body: req.body };
  try {
    console.log('START', context);
    const productId = Number(req.params.productId);
    const { imageOrders } = req.body; // [{ id: 1, sortOrder: 0 }, { id: 2, sortOrder: 1 }]

    if (!Array.isArray(imageOrders)) {
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

    console.log('END', { ...context, updatedCount: imageOrders.length });
    return res.json({ success: true, updatedCount: imageOrders.length });
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
    return res.status(500).json({ 
      message: 'Server error', 
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined 
    });
  }
};
