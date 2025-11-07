import prisma from "../config/prisma.js";
import logger from '../utils/logger.js';

// ===========================
//  TẠO BIẾN THỂ SẢN PHẨM
// ===========================
export const createProductVariant = async (req, res) => {
  try {
    const { productId, name, price, stockQuantity, size, color, isActive } = req.body;

    // Kiểm tra product tồn tại
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) },
    });
    if (!product) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại" });
    }

    // Kiểm tra trùng biến thể (theo product + size + color)
    const existingVariant = await prisma.productVariant.findFirst({
      where: {
        productId: Number(productId),
        size: size || null,
        color: color || null,
      },
    });
    if (existingVariant) {
      return res.status(400).json({ message: "Biến thể với màu & size này đã tồn tại" });
    }

    // Tạo mới biến thể (không có SKU)
    const variant = await prisma.productVariant.create({
      data: {
        productId: Number(productId),
        name,
        price: price ? parseFloat(price) : null,
        stockQuantity: stockQuantity ? Number(stockQuantity) : 0,
        size,
        color,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    logger.success('Product variant created', { variantId: variant.id, productId: variant.productId });
    res.status(201).json({ message: "Tạo biến thể thành công", data: variant });
  } catch (error) {
    logger.error('Failed to create product variant', { error: error.message, stack: error.stack });
    res.status(500).json({ message: "Lỗi khi tạo biến thể", error: error.message });
  }
};



// ==============================
// ✅ Lấy danh sách biến thể (có phân trang + tìm kiếm)
// 🔄 TỰ ĐỘNG DETECT: Public (không token) hoặc Admin (có token)
// ==============================
export const getProductVariants = async (req, res) => {
  // 🔑 BƯỚC 1: Detect public/admin dựa vào req.user
  const isPublicRoute = !req.user;
  
  try {
    // Lấy query params từ request, nếu không truyền thì mặc định page=1, limit=5
    const { page = 1, limit = 5, keyword, productId } = req.query;

    // Tạo điều kiện tìm kiếm (where)
    const where = {
      // Nếu có productId thì lọc theo productId
      ...(productId ? { productId: Number(productId) } : {}),
      // Nếu có keyword thì tìm theo name, color, size
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword } },   // Tìm theo tên
              { color: { contains: keyword } },   // Tìm theo màu
              { size: { contains: keyword } },   // Tìm theo size
            ],
          }
        : {}),
    };

    // 🔑 BƯỚC 2: Public chỉ xem biến thể ACTIVE
    if (isPublicRoute) {
      where.isActive = true;
      logger.debug('Public API: filtering active variants only');
    }
    // Admin xem tất cả (không filter isActive)

    // Thực hiện 2 query song song: lấy danh sách items + đếm tổng số bản ghi
    const [items, total] = await Promise.all([
      prisma.productVariant.findMany({
        where,                            // Điều kiện lọc
        orderBy: { createdAt: "desc" },   // Sắp xếp theo ngày tạo mới nhất
        skip: (Number(page) - 1) * Number(limit), // Bỏ qua số bản ghi trước đó (phân trang)
        take: Number(limit),              // Giới hạn số bản ghi lấy ra (theo limit)
        include: {
          product: { select: { name: true, brand: true } }, // Join thêm thông tin sản phẩm & brand
        },
      }),
      prisma.productVariant.count({ where }), // Đếm tổng số bản ghi thoả mãn điều kiện
    ]);

    // Log phân biệt public vs admin
    logger.success(
      `${isPublicRoute ? 'Public' : 'Admin'} variants fetched`, 
      { count: items.length, total }
    );

    // Trả response cho client
    res.json({
      code: 200,
      message: "Lấy danh sách biến thể thành công",
      data: {
        variants: items, // Danh sách biến thể
        pagination: {    // Thông tin phân trang
          total,                             // Tổng số bản ghi
          page: Number(page),                // Trang hiện tại
          limit: Number(limit),              // Giới hạn số bản ghi mỗi trang
          totalPages: Math.ceil(total / limit), // Tổng số trang
        },
      },
    });
  } catch (error) {
    logger.error('Failed to fetch product variants', { error: error.message, stack: error.stack });
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};




// ===========================
// ✅ LẤY CHI TIẾT BIẾN THỂ
// 🔄 TỰ ĐỘNG DETECT: Public (không token) hoặc Admin (có token)
// ===========================
export const getProductVariantById = async (req, res) => {
  // 🔑 BƯỚC 1: Detect public/admin dựa vào req.user
  const isPublicRoute = !req.user;
  
  try {
    const { id } = req.params;

    // 🔑 BƯỚC 2: Xây dựng điều kiện WHERE
    const where = { id: Number(id) };
    
    // 🚨 QUAN TRỌNG: Public chỉ xem biến thể ACTIVE
    if (isPublicRoute) {
      // Sử dụng findFirst để có thể filter theo isActive
      const variant = await prisma.productVariant.findFirst({
        where: {
          ...where,
          isActive: true, // Public chỉ xem biến thể active
        },
        include: { product: { select: { name: true, brand: true } } },
      });

      if (!variant) {
        logger.warn('Public API: Variant not found or not active', { id });
        return res.status(404).json({ message: "Không tìm thấy biến thể" });
      }

      logger.success('Public API: Variant fetched', { id: variant.id, isActive: variant.isActive });
      return res.json({ data: variant });
    }

    // Admin xem tất cả (kể cả isActive = false)
    const variant = await prisma.productVariant.findUnique({
      where,
      include: { product: { select: { name: true, brand: true } } },
    });

    if (!variant) {
      logger.warn('Admin API: Variant not found', { id });
      return res.status(404).json({ message: "Không tìm thấy biến thể" });
    }

    logger.success('Admin API: Variant fetched', { id: variant.id, isActive: variant.isActive });
    res.json({ data: variant });
  } catch (error) {
    logger.error('Failed to fetch variant by ID', { error: error.message, stack: error.stack });
    res.status(500).json({ message: "Lỗi khi lấy chi tiết biến thể" });
  }
};



// ===========================
//  CẬP NHẬT BIẾN THỂ
// ===========================
export const updateProductVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, stockQuantity, size, color, isActive } = req.body;

    //  Kiểm tra biến thể tồn tại
    const variant = await prisma.productVariant.findUnique({
      where: { id: Number(id) },
    });
    if (!variant) {
      return res.status(404).json({ message: "Biến thể không tồn tại" });
    }

    // Nếu đổi color/size, kiểm tra có bị trùng biến thể khác không
    if (size || color) {
      const duplicate = await prisma.productVariant.findFirst({
        where: {
          productId: variant.productId,
          size: size || null,
          color: color || null,
          NOT: { id: variant.id },
        },
      });
      if (duplicate) {
        return res.status(400).json({ message: "Đã tồn tại biến thể có cùng màu & size" });
      }
    }

    //  Cập nhật biến thể
    const updated = await prisma.productVariant.update({
      where: { id: Number(id) },
      data: {
        name,
        price: price ? parseFloat(price) : variant.price,
        stockQuantity: stockQuantity !== undefined ? Number(stockQuantity) : variant.stockQuantity,
        size: size ?? variant.size,
        color: color ?? variant.color,
        isActive: isActive ?? variant.isActive,
      },
    });

    logger.success('Product variant updated', { variantId: updated.id });
    res.json({ message: "Cập nhật biến thể thành công", data: updated });
  } catch (error) {
    logger.error('Failed to update product variant', { error: error.message, stack: error.stack });
    res.status(500).json({ message: "Lỗi khi cập nhật biến thể" });
  }
};



// ===========================
// XÓA BIẾN THỂ
// ===========================
export const deleteProductVariant = async (req, res) => {
  try {
    const { id } = req.params;

    //  Kiểm tra tồn tại
    const variant = await prisma.productVariant.findUnique({
      where: { id: Number(id) },
    });
    if (!variant) {
      return res.status(404).json({ message: "Biến thể không tồn tại" });
    }

    //  Xóa
    await prisma.productVariant.delete({
      where: { id: Number(id) },
    });

    logger.success('Product variant deleted', { variantId: id });
    res.json({ message: "Xóa biến thể thành công" });
  } catch (error) {
    logger.error('Failed to delete product variant', { error: error.message, stack: error.stack });
    res.status(500).json({ message: "Lỗi khi xóa biến thể" });
  }
};
