import prisma from "../config/prisma.js";
import logger from "../utils/logger.js";

// Lấy danh sách sản phẩm yêu thích của user
export const getWishlist = async (req, res) => {
  const context = { path: 'wishlist.list' };
  try {
    logger.start(context.path, { userId: req.user.id });
    
    const userId = req.user.id;
    
    const wishlist = await prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: {
              where: { isPrimary: true },
              take: 1
            },
            category: true,
            brand: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    logger.success('Wishlist fetched', { count: wishlist.length });
    logger.end(context.path, { count: wishlist.length });
    
    res.status(200).json({ 
      message: "Lấy danh sách yêu thích thành công", 
      wishlist,
      count: wishlist.length
    });
  } catch (error) {
    logger.error('Failed to fetch wishlist', {
      path: context.path,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      message: "Server error", 
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined 
    });
  }
};

// Thêm sản phẩm vào danh sách yêu thích
export const addToWishlist = async (req, res) => {
  const context = { path: 'wishlist.add' };
  try {
    logger.start(context.path, { userId: req.user.id, productId: req.body.productId });
    
    const userId = req.user.id;
    const { productId } = req.body;

    if (!productId || isNaN(productId)) {
      logger.warn('Invalid product ID', { productId });
      return res.status(400).json({ message: "ID sản phẩm không hợp lệ" });
    }

    // Kiểm tra sản phẩm có tồn tại không
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) }
    });
    if (!product) {
      logger.warn('Product not found', { productId });
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    // Kiểm tra đã có trong wishlist chưa
    const existingItem = await prisma.wishlist.findFirst({
      where: {
        userId,
        productId: Number(productId)
      }
    });

    if (existingItem) {
      logger.warn('Product already in wishlist', { productId });
      return res.status(400).json({ message: "Sản phẩm đã có trong danh sách yêu thích" });
    }

    // Thêm vào wishlist
    const wishlistItem = await prisma.wishlist.create({
      data: {
        userId,
        productId: Number(productId)
      },
      include: {
        product: {
          include: {
            images: {
              where: { isPrimary: true },
              take: 1
            },
            category: true,
            brand: true
          }
        }
      }
    });

    logger.success('Added to wishlist', { id: wishlistItem.id, productId });
    logger.end(context.path, { id: wishlistItem.id });
    
    res.status(201).json({ 
      message: "Đã thêm sản phẩm vào danh sách yêu thích", 
      wishlistItem 
    });
  } catch (error) {
    logger.error('Failed to add to wishlist', {
      path: context.path,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: "Server error" });
  }
};

// Xóa sản phẩm khỏi danh sách yêu thích
export const removeFromWishlist = async (req, res) => {
  const context = { path: 'wishlist.remove' };
  try {
    logger.start(context.path, { userId: req.user.id, productId: req.params.productId });
    
    const userId = req.user.id;
    const { productId } = req.params;

    if (!productId || isNaN(productId)) {
      logger.warn('Invalid product ID', { productId });
      return res.status(400).json({ message: "ID sản phẩm không hợp lệ" });
    }

    // Kiểm tra item có trong wishlist không
    const wishlistItem = await prisma.wishlist.findFirst({
      where: {
        userId,
        productId: Number(productId)
      }
    });

    if (!wishlistItem) {
      logger.warn('Product not in wishlist', { productId });
      return res.status(404).json({ message: "Sản phẩm không có trong danh sách yêu thích" });
    }

    // Xóa khỏi wishlist
    await prisma.wishlist.deleteMany({
      where: {
        userId,
        productId: Number(productId)
      }
    });

    logger.success('Removed from wishlist', { productId });
    logger.end(context.path, { productId });
    
    res.status(200).json({ message: "Đã xóa sản phẩm khỏi danh sách yêu thích" });
  } catch (error) {
    logger.error('Failed to remove from wishlist', {
      path: context.path,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: "Server error" });
  }
};

// Kiểm tra sản phẩm có trong wishlist không
export const checkWishlistStatus = async (req, res) => {
  const context = { path: 'wishlist.check' };
  try {
    logger.start(context.path, { userId: req.user.id, productId: req.params.productId });
    
    const userId = req.user.id;
    const { productId } = req.params;

    if (!productId || isNaN(productId)) {
      logger.warn('Invalid product ID', { productId });
      return res.status(400).json({ message: "ID sản phẩm không hợp lệ" });
    }

    const wishlistItem = await prisma.wishlist.findFirst({
      where: {
        userId,
        productId: Number(productId)
      }
    });

    const isInWishlist = !!wishlistItem;

    logger.debug('Wishlist status checked', { isInWishlist, productId });
    logger.end(context.path, { isInWishlist });
    
    res.status(200).json({ 
      message: "Kiểm tra trạng thái yêu thích thành công",
      isInWishlist,
      productId: Number(productId)
    });
  } catch (error) {
    logger.error('Failed to check wishlist status', {
      path: context.path,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: "Server error" });
  }
};

// Xóa tất cả sản phẩm khỏi wishlist
export const clearWishlist = async (req, res) => {
  const context = { path: 'wishlist.clear' };
  try {
    logger.start(context.path, { userId: req.user.id });
    
    const userId = req.user.id;

    const result = await prisma.wishlist.deleteMany({
      where: { userId }
    });

    logger.success('Wishlist cleared', { deletedCount: result.count });
    logger.end(context.path, { deletedCount: result.count });
    
    res.status(200).json({ 
      message: "Đã xóa tất cả sản phẩm khỏi danh sách yêu thích",
      deletedCount: result.count
    });
  } catch (error) {
    logger.error('Failed to clear wishlist', {
      path: context.path,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: "Server error" });
  }
};

// Lấy số lượng sản phẩm trong wishlist
export const getWishlistCount = async (req, res) => {
  const context = { path: 'wishlist.count' };
  try {
    logger.start(context.path, { userId: req.user.id });
    
    const userId = req.user.id;

    const count = await prisma.wishlist.count({
      where: { userId }
    });

    logger.debug('Wishlist count fetched', { count });
    logger.end(context.path, { count });
    
    res.status(200).json({ 
      message: "Lấy số lượng yêu thích thành công",
      count
    });
  } catch (error) {
    logger.error('Failed to get wishlist count', {
      path: context.path,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: "Server error" });
  }
};
