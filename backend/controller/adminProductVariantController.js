// Import các thư viện cần thiết
import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

// ==================== ADMIN PRODUCT VARIANT CONTROLLER ====================

/**
 * Lấy danh sách tất cả variants (có thể filter theo productId)
 * GET /api/admin/product-variants?productId=1&page=1&limit=10
 */
export const getProductVariants = async (req, res) => {
  const context = { path: 'admin.productVariants.list' };
  try {
    const { productId, page = 1, limit = 10, keyword } = req.query;
    logger.start(context.path, { productId, page, limit, keyword });

    // Xây dựng where clause
    const where = {};
    
    if (productId) {
      where.productId = Number(productId);
    }
    
    // Tìm kiếm theo keyword (tìm trong color, material, hoặc product name)
    // MySQL/MariaDB không hỗ trợ mode: 'insensitive', dùng contains (case-sensitive)
    if (keyword && keyword.trim()) {
      const searchTerm = keyword.trim();
      where.OR = [
        { color: { contains: searchTerm } },
        { material: { contains: searchTerm } },
        { dimensionNote: { contains: searchTerm } },
        { product: { name: { contains: searchTerm } } }
      ];
    }
    
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const [variants, total] = await Promise.all([
      prisma.productVariant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          product: {
            select: { id: true, name: true, slug: true }
          }
        }
      }),
      prisma.productVariant.count({ where })
    ]);

    logger.success('Admin variants fetched', { count: variants.length, total });
    return res.json({
      data: {
        variants,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total
        }
      }
    });
  } catch (error) {
    logger.error('Failed to fetch admin variants', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    const payload = { message: 'Server error' };
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};

/**
 * Lấy chi tiết 1 variant (ADMIN)
 * GET /api/admin/product-variants/:id
 */
export const getProductVariantById = async (req, res) => {
  const context = { path: 'admin.productVariants.getById' };
  try {
    const id = Number(req.params.id);
    logger.start(context.path, { id });

    const variant = await prisma.productVariant.findUnique({
      where: { id },
      include: {
        product: {
          select: { id: true, name: true, slug: true, category: true }
        }
      }
    });

    if (!variant) {
      logger.warn('Variant not found', { id });
      return res.status(404).json({ message: 'Variant not found' });
    }

    logger.success('Variant fetched', { id });
    return res.json(variant);
  } catch (error) {
    logger.error('Failed to fetch variant', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    const payload = { message: 'Server error' };
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};

/**
 * Tạo variant mới
 * POST /api/admin/product-variants
 */
export const createProductVariant = async (req, res) => {
  const context = { path: 'admin.productVariants.create' };
  try {
    logger.start(context.path, { body: req.body });

    const {
      productId, stockQuantity, minStockLevel, isActive,
      width, depth, height, heightMax,
      warranty, material, weightCapacity, color, dimensionNote
    } = req.body;

    // Validation
    if (!productId) {
      return res.status(400).json({ message: 'productId is required' });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({ 
      where: { id: Number(productId) } 
    });
    
    if (!product) {
      logger.warn('Product not found', { productId });
      return res.status(404).json({ message: 'Product not found' });
    }

    const variantData = {
      productId: Number(productId),
      stockQuantity: Number(stockQuantity) || 0,
      minStockLevel: Number(minStockLevel) || 5,
      isActive: isActive !== false,
      width: width ? Number(width) : null,
      depth: depth ? Number(depth) : null,
      height: height ? Number(height) : null,
      heightMax: heightMax ? Number(heightMax) : null,
      warranty: warranty?.trim() || null,
      material: material?.trim() || null,
      weightCapacity: weightCapacity ? Number(weightCapacity) : null,
      color: color?.trim() || null,
      dimensionNote: dimensionNote?.trim() || null,
    };

    const variant = await prisma.productVariant.create({ 
      data: variantData,
      include: {
        product: {
          select: { id: true, name: true }
        }
      }
    });

    logger.success('Variant created', { variantId: variant.id });
    return res.status(201).json({ 
      message: 'Variant created successfully', 
      variant 
    });
  } catch (error) {
    logger.error('Failed to create variant', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    const payload = { message: 'Server error' };
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};

/**
 * Cập nhật variant
 * PUT /api/admin/product-variants/:id
 */
export const updateProductVariant = async (req, res) => {
  const context = { path: 'admin.productVariants.update' };
  try {
    const id = Number(req.params.id);
    logger.start(context.path, { id, body: req.body });

    const variant = await prisma.productVariant.findUnique({
      where: { id }
    });

    if (!variant) {
      logger.warn('Variant not found', { id });
      return res.status(404).json({ message: 'Variant not found' });
    }

    const data = { ...req.body };
    
    // Cho phép cập nhật productId (chuyển variant sang sản phẩm khác)
    if (data.productId !== undefined) {
      data.productId = Number(data.productId);
      
      // Kiểm tra sản phẩm mới có tồn tại không
      const newProduct = await prisma.product.findUnique({
        where: { id: data.productId }
      });
      
      if (!newProduct) {
        logger.warn('Product not found', { productId: data.productId });
        return res.status(400).json({ message: 'Sản phẩm không tồn tại' });
      }
    }

    // Convert numbers
    if (data.stockQuantity !== undefined) data.stockQuantity = Number(data.stockQuantity);
    if (data.minStockLevel !== undefined) data.minStockLevel = Number(data.minStockLevel);
    if (data.width !== undefined) data.width = data.width ? Number(data.width) : null;
    if (data.depth !== undefined) data.depth = data.depth ? Number(data.depth) : null;
    if (data.height !== undefined) data.height = data.height ? Number(data.height) : null;
    if (data.heightMax !== undefined) data.heightMax = data.heightMax ? Number(data.heightMax) : null;
    if (data.weightCapacity !== undefined) data.weightCapacity = data.weightCapacity ? Number(data.weightCapacity) : null;

    // Trim strings
    if (data.warranty !== undefined) data.warranty = data.warranty?.trim() || null;
    if (data.material !== undefined) data.material = data.material?.trim() || null;
    if (data.color !== undefined) data.color = data.color?.trim() || null;
    if (data.dimensionNote !== undefined) data.dimensionNote = data.dimensionNote?.trim() || null;

    // Cập nhật variant
    const updated = await prisma.productVariant.update({
      where: { id },
      data,
      include: {
        product: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    logger.success('Variant updated', { id, productIdChanged: data.productId !== undefined && data.productId !== variant.productId });
    return res.json({ 
      message: 'Variant updated successfully', 
      variant: updated 
    });
  } catch (error) {
    logger.error('Failed to update variant', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    const payload = { message: 'Server error' };
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};

/**
 * Xóa variant
 * DELETE /api/admin/product-variants/:id
 */
export const deleteProductVariant = async (req, res) => {
  const context = { path: 'admin.productVariants.delete' };
  try {
    const id = Number(req.params.id);
    logger.start(context.path, { id });

    // Kiểm tra variant có tồn tại không
    const variant = await prisma.productVariant.findUnique({
      where: { id }
    });

    if (!variant) {
      logger.warn('Variant not found', { id });
      return res.status(404).json({ message: 'Variant not found' });
    }

    // Kiểm tra xem variant có đang được sử dụng trong đơn hàng không
    // Đếm số lượng orderItems để đảm bảo chính xác
    const orderItemsCount = await prisma.orderItem.count({
      where: { variantId: id }
    });

    if (orderItemsCount > 0) {
      logger.warn('Cannot delete variant with orders', { 
        id, 
        orderItemsCount 
      });
      return res.status(400).json({ 
        message: 'Không thể xóa biến thể đã có trong đơn hàng. Vui lòng vô hiệu hóa biến thể thay vì xóa.' 
      });
    }

    // Xóa variant (cartItems sẽ tự xóa do onDelete: Cascade nếu có)
    await prisma.productVariant.delete({
      where: { id }
    });

    logger.success('Variant deleted', { id });
    return res.json({ message: 'Variant deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete variant', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    
    // Kiểm tra lỗi foreign key constraint
    if (error.code === 'P2003' || error.message.includes('Foreign key constraint')) {
      return res.status(400).json({ 
        message: 'Không thể xóa biến thể vì đang được sử dụng trong hệ thống' 
      });
    }
    
    const payload = { message: 'Server error' };
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};

// ==================== PUBLIC PRODUCT VARIANT CONTROLLER ====================

/**
 * Lấy danh sách variants PUBLIC (chỉ lấy isActive = true)
 * GET /api/product-variants/public?productId=1
 */
export const getPublicProductVariants = async (req, res) => {
  const context = { path: 'public.productVariants.list' };
  try {
    const { productId } = req.query;
    logger.start(context.path, { productId });

    if (!productId) {
      return res.status(400).json({ message: 'productId is required' });
    }

    const variants = await prisma.productVariant.findMany({
      where: { 
        productId: Number(productId),
        isActive: true  // CHỈ LẤY ACTIVE
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        stockQuantity: true,
        minStockLevel: true,
        width: true,
        depth: true,
        height: true,
        heightMax: true,
        warranty: true,
        material: true,
        weightCapacity: true,
        color: true,
        dimensionNote: true,
        isActive: true
      }
    });

    logger.success('Public variants fetched', { count: variants.length });
    return res.json({ variants });
  } catch (error) {
    logger.error('Failed to fetch public variants', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    const payload = { message: 'Server error' };
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};

/**
 * Lấy chi tiết 1 variant PUBLIC (chỉ lấy isActive = true)
 * GET /api/product-variants/public/:id
 */
export const getPublicProductVariantById = async (req, res) => {
  const context = { path: 'public.productVariants.getById' };
  try {
    const id = Number(req.params.id);
    logger.start(context.path, { id });

    const variant = await prisma.productVariant.findUnique({
      where: { 
        id,
        isActive: true  // CHỈ LẤY ACTIVE
      },
      select: {
        id: true,
        stockQuantity: true,
        minStockLevel: true,
        width: true,
        depth: true,
        height: true,
        heightMax: true,
        warranty: true,
        material: true,
        weightCapacity: true,
        color: true,
        dimensionNote: true,
        isActive: true,
        product: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    if (!variant) {
      logger.warn('Public variant not found', { id });
      return res.status(404).json({ message: 'Variant not found' });
    }

    logger.success('Public variant fetched', { id });
    return res.json(variant);
  } catch (error) {
    logger.error('Failed to fetch public variant', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    const payload = { message: 'Server error' };
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};

