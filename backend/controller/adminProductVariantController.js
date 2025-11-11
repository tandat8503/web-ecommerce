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
    const { productId, page = 1, limit = 10 } = req.query;
    logger.start(context.path, { productId, page, limit });

    const where = productId ? { productId: Number(productId) } : {};
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
    
    // Remove productId from update (không cho phép đổi productId)
    delete data.productId;

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

    const updated = await prisma.productVariant.update({
      where: { id },
      data,
      include: {
        product: {
          select: { id: true, name: true }
        }
      }
    });

    logger.success('Variant updated', { id });
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

    const variant = await prisma.productVariant.findUnique({
      where: { id }
    });

    if (!variant) {
      logger.warn('Variant not found', { id });
      return res.status(404).json({ message: 'Variant not found' });
    }

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

