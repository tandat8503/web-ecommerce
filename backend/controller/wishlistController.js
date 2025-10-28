import prisma from "../config/prisma.js";

// Lấy danh sách sản phẩm yêu thích của user
export const getWishlist = async (req, res) => {
  const context = { path: 'wishlist.list', userId: req.user?.id };
  try {
    console.log('START', context);
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

    console.log('END', { ...context, count: wishlist.length });
    res.status(200).json({ 
      message: "Lấy danh sách yêu thích thành công", 
      wishlist,
      count: wishlist.length
    });
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
    res.status(500).json({ 
      message: "Server error", 
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined 
    });
  }
};

// Thêm sản phẩm vào danh sách yêu thích
export const addToWishlist = async (req, res) => {
  const context = { path: 'wishlist.add', userId: req.user?.id };
  try {
    console.log('START', { ...context, body: req.body });
    const userId = req.user.id;
    const { productId } = req.body;

    if (!productId || isNaN(productId)) {
      return res.status(400).json({ message: "ID sản phẩm không hợp lệ" });
    }

    // Kiểm tra sản phẩm có tồn tại không
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) }
    });
    if (!product) {
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

    console.log('END', { ...context, id: wishlistItem.id });
    res.status(201).json({ 
      message: "Đã thêm sản phẩm vào danh sách yêu thích", 
      wishlistItem 
    });
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
    res.status(500).json({ message: "Server error" });
  }
};

// Xóa sản phẩm khỏi danh sách yêu thích
export const removeFromWishlist = async (req, res) => {
  const context = { path: 'wishlist.remove', userId: req.user?.id, params: req.params };
  try {
    console.log('START', context);
    const userId = req.user.id;
    const { productId } = req.params;

    if (!productId || isNaN(productId)) {
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
      return res.status(404).json({ message: "Sản phẩm không có trong danh sách yêu thích" });
    }

    // Xóa khỏi wishlist
    await prisma.wishlist.deleteMany({
      where: {
        userId,
        productId: Number(productId)
      }
    });

    console.log('END', context);
    res.status(200).json({ message: "Đã xóa sản phẩm khỏi danh sách yêu thích" });
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
    res.status(500).json({ message: "Server error" });
  }
};

// Kiểm tra sản phẩm có trong wishlist không
export const checkWishlistStatus = async (req, res) => {
  const context = { path: 'wishlist.check', userId: req.user?.id, params: req.params };
  try {
    console.log('START', context);
    const userId = req.user.id;
    const { productId } = req.params;

    if (!productId || isNaN(productId)) {
      return res.status(400).json({ message: "ID sản phẩm không hợp lệ" });
    }

    const wishlistItem = await prisma.wishlist.findFirst({
      where: {
        userId,
        productId: Number(productId)
      }
    });

    const isInWishlist = !!wishlistItem;

    console.log('END', { ...context, isInWishlist });
    res.status(200).json({ 
      message: "Kiểm tra trạng thái yêu thích thành công",
      isInWishlist,
      productId: Number(productId)
    });
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
    res.status(500).json({ message: "Server error" });
  }
};

// Xóa tất cả sản phẩm khỏi wishlist
export const clearWishlist = async (req, res) => {
  const context = { path: 'wishlist.clear', userId: req.user?.id };
  try {
    console.log('START', context);
    const userId = req.user.id;

    const result = await prisma.wishlist.deleteMany({
      where: { userId }
    });

    console.log('END', { ...context, deletedCount: result.count });
    res.status(200).json({ 
      message: "Đã xóa tất cả sản phẩm khỏi danh sách yêu thích",
      deletedCount: result.count
    });
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
    res.status(500).json({ message: "Server error" });
  }
};

// Lấy số lượng sản phẩm trong wishlist
export const getWishlistCount = async (req, res) => {
  const context = { path: 'wishlist.count', userId: req.user?.id };
  try {
    console.log('START', context);
    const userId = req.user.id;

    const count = await prisma.wishlist.count({
      where: { userId }
    });

    console.log('END', { ...context, count });
    res.status(200).json({ 
      message: "Lấy số lượng yêu thích thành công",
      count
    });
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
    res.status(500).json({ message: "Server error" });
  }
};
