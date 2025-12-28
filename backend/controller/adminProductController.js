// Import các thư viện cần thiết
import prisma from '../config/prisma.js'; // Prisma client để kết nối database
import { slugify } from '../utils/slugify.js'; // Utility function để tạo slug
import cloudinary from '../config/cloudinary.js'; // Cloudinary client để upload ảnh
import { searchProductsWithFullText } from '../utils/fulltextSearch.js'; // FullText search utility
import logger from '../utils/logger.js'; // Logger utility
import { emitProductCreated, emitProductUpdated, emitProductDeleted } from '../config/socket.js';

// Cấu hình include cơ bản cho các query sản phẩm
// Chỉ lấy thông tin cần thiết của category và brand để tối ưu performance
const includeBasic = {
  category: { select: { id: true, name: true, slug: true, isActive: true } }, // Chỉ lấy id, name, slug, isActive của category
  brand: { select: { id: true, name: true } }, // Chỉ lấy id, name của brand
  variants: {
    where: { isActive: true }, // Chỉ lấy variants đang active
    select: { stockQuantity: true } // Chỉ cần stockQuantity để tính tổng
  }
};

// Helper function để tính tổng stock từ variants
const calculateTotalStock = (product) => {
  if (!product.variants || product.variants.length === 0) {
    return 0; // Nếu không có variant thì stock = 0
  }
  return product.variants.reduce((sum, variant) => sum + (variant.stockQuantity || 0), 0);
};

// Function lấy danh sách sản phẩm với phân trang và tìm kiếm FullText
export const listProducts = async (req, res) => {
  // Tạo context object để log và debug
  const context = { path: 'admin.products.list' };
  try {
    logger.start(context.path, {
      query: req.query,
      user: req.user ? { id: req.user.id, role: req.user.role } : 'No user'
    });

    // Lấy các tham số từ query string với giá trị mặc định
    const { page = 1, limit = 10, q, categoryId, brandId, status, isFeatured, onSale, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Detect public/admin route
    const isPublicRoute = !req.user;

    logger.debug('Query params', { page, limit, q, categoryId, brandId, status, isFeatured, onSale, sortBy, sortOrder, isPublicRoute });

    let items, total;

    // Nếu có search query (q), sử dụng FullText search
    if (q && q.trim()) {
      // Sử dụng FullText search utility
      const result = await searchProductsWithFullText({
        searchTerm: q,
        categoryId: categoryId ? Number(categoryId) : undefined,
        brandId: brandId ? Number(brandId) : undefined,
        status: status ? status.toUpperCase() : undefined,
        isFeatured: isFeatured,
        isPublicRoute,
        skip,
        limit: limitNum
      });

      items = result.items;
      total = result.total;
    } else {
      // Không có search query, sử dụng Prisma query thông thường
      const and = [];
      if (categoryId) and.push({ categoryId: Number(categoryId) });
      if (brandId) and.push({ brandId: Number(brandId) });
      if (status) and.push({ status: status.toUpperCase() });

      // Filter theo isFeatured nếu có
      if (isFeatured !== undefined) {
        and.push({ isFeatured: isFeatured === 'true' || isFeatured === true });
      }

      // Filter theo onSale nếu có (sản phẩm có salePrice và salePrice < price)
      if (onSale !== undefined && (onSale === 'true' || onSale === true)) {
        // Sản phẩm sale: có salePrice và salePrice < price
        // Prisma không hỗ trợ so sánh 2 field trực tiếp, nên filter salePrice !== null
        // Frontend sẽ kiểm tra salePrice < price
        and.push({ salePrice: { not: null } });
      }

      // Public route chỉ lấy ACTIVE products
      if (isPublicRoute) {
        and.push({ status: 'ACTIVE' });

        // ✅ Public route chỉ lấy sản phẩm từ category đang hoạt động (isActive = true)
        // Filter sản phẩm từ category đang hoạt động
        and.push({
          category: {
            isActive: true
          }
        });
      }

      const where = and.length ? { AND: and } : undefined;

      // Thực hiện 2 query song song để tối ưu performance
      [items, total] = await Promise.all([
        prisma.product.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limitNum,
          include: includeBasic
        }),
        prisma.product.count({ where })
      ]);
    }

    // Tính tổng stock từ variants cho mỗi sản phẩm
    const itemsWithStock = items.map(product => ({
      ...product,
      stockQuantity: calculateTotalStock(product) // Thêm field stockQuantity tính từ variants
    }));

    // Tạo response payload với thông tin phân trang
    const payload = { items: itemsWithStock, total, page: pageNum, limit: limitNum };
    logger.success('Products fetched', { total: payload.total, itemsCount: items.length });
    logger.end(context.path, { total: payload.total, itemsCount: items.length });
    return res.json(payload);
  } catch (error) {
    // Xử lý lỗi và log
    logger.error('Failed to fetch products', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    const payload = {
      success: false,
      message: 'Server error'
    };
    // Chỉ hiển thị chi tiết lỗi trong môi trường development
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};

// // Function lấy chi tiết một sản phẩm theo ID
// export const getProduct = async (req, res) => {
//   // Tạo context object để log và debug
//   const context = { path: 'admin.products.get', params: req.params };
//   try {
//     console.log('START', context);

//     // Lấy ID từ URL params và chuyển đổi sang number
//     const id = Number(req.params.id);

//     // Tìm sản phẩm theo ID với thông tin category và brand
//     const product = await prisma.product.findUnique({ 
//       where: { id }, 
//       include: includeBasic 
//     });

//     // Kiểm tra sản phẩm có tồn tại không
//     if (!product) {
//       console.warn('NOT_FOUND', context);
//       return res.status(404).json({ message: 'Not found' });
//     }

//     console.log('END', { ...context, id });
//     return res.json(product);
//   } catch (error) {
//     // Xử lý lỗi và log
//     console.error('ERROR', { ...context, error: error.message });
//     const payload = { message: 'Server error' };
//     // Chỉ hiển thị chi tiết lỗi trong môi trường development
//     if (process.env.NODE_ENV !== 'production') payload.error = error.message;
//     return res.status(500).json(payload);
//   }
// };


// ✅ Function lấy chi tiết một sản phẩm theo ID
// 🔄 TỰ ĐỘNG DETECT: Public (không token) hoặc Admin (có token)  
export const getProduct = async (req, res) => {
  // 🔑 BƯỚC 1: Detect public/admin dựa vào req.user (GIỐNG listProducts)
  const isPublicRoute = !req.user;

  // Tạo context với path tự động
  const context = {
    path: isPublicRoute ? 'public.products.get' : 'admin.products.get'
  };

  try {
    // Log phân biệt public vs admin
    logger.start(context.path, {
      id: req.params.id,
      isPublicRoute
    });

    // Lấy ID từ URL params
    const id = Number(req.params.id);

    // 🔑 BƯỚC 2: Xây dựng điều kiện WHERE
    const where = { id };

    // 🚨 QUAN TRỌNG: Public chỉ xem sản phẩm ACTIVE và từ category đang hoạt động
    if (isPublicRoute) {
      where.status = 'ACTIVE';
      // ✅ Chỉ lấy sản phẩm từ category đang hoạt động (isActive = true)
      where.category = {
        isActive: true
      };
      logger.debug('Public API: Force status = ACTIVE and category.isActive = true', { id });
    }
    // Admin xem tất cả (không thêm điều kiện status và category.isActive)

    // 🔑 BƯỚC 3: Dùng findFirst thay vì findUnique để có thể filter theo status và category
    const product = await prisma.product.findFirst({
      where,
      include: includeBasic
    });

    // Kiểm tra sản phẩm có tồn tại không
    if (!product) {
      logger.warn('Product not found', { id, isPublicRoute });
      return res.status(404).json({ message: 'Not found' });
    }

    // Tính tổng stock từ variants và thêm vào response
    const productWithStock = {
      ...product,
      stockQuantity: calculateTotalStock(product) // Thêm field stockQuantity tính từ variants
    };

    // Log kết quả
    logger.success('Product fetched', { id, isPublicRoute, stockQuantity: productWithStock.stockQuantity });
    logger.end(context.path, { id });
    return res.json(productWithStock);
  } catch (error) {
    // Xử lý lỗi
    logger.error('Failed to fetch product', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    const payload = { message: 'Server error' };
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};

export const createProduct = async (req, res) => {
  const context = { path: 'admin.products.create' };
  try {
    logger.start(context.path, { name: req.body.name });

    const {
      name, slug: slugInput, price, salePrice, costPrice,
      description, metaTitle, metaDescription, categoryId, brandId, isActive, isFeatured
    } = req.body;

    // Validation cơ bản
    if (!name || !price || !categoryId || !brandId) {
      logger.warn('Missing required fields', { name, price, categoryId, brandId });
      return res.status(400).json({ message: 'Missing required fields: name, price, categoryId, brandId' });
    }

    // Xử lý image upload
    const imageUrl = req.file ? req.file.path : null;
    const imagePublicId = req.file ? req.file.filename : null;

    if (req.file) {
      logger.debug('Image uploaded', { imageUrl, imagePublicId });
    }

    const [cat, br] = await Promise.all([
      prisma.category.findUnique({ where: { id: Number(categoryId) } }),
      prisma.brand.findUnique({ where: { id: Number(brandId) } })
    ]);
    if (!cat) return res.status(400).json({ message: 'Invalid categoryId' });
    if (!cat.isActive) return res.status(400).json({ message: 'Không thể tạo sản phẩm với danh mục đã bị tắt' });
    if (!br) return res.status(400).json({ message: 'Invalid brandId' });

    // Tạo slug tự động
    const slug = slugInput?.trim() || slugify(name);

    // Kiểm tra slug trùng lặp
    const dupSlug = await prisma.product.findUnique({ where: { slug } });
    if (dupSlug) {
      logger.warn('Slug conflict', { slug });
      return res.status(409).json({ message: 'Slug already exists' });
    }

    // ✅ VALIDATION: Kiểm tra salePrice phải nhỏ hơn price
    if (salePrice && Number(salePrice) >= Number(price)) {
      logger.warn('Invalid salePrice', { price, salePrice });
      return res.status(400).json({
        success: false,
        message: 'Giá khuyến mãi phải nhỏ hơn giá gốc'
      });
    }

    // Chuẩn bị dữ liệu để tạo sản phẩm (CHỈ THÔNG TIN CHUNG + GIÁ)
    const productData = {
      name: name.trim(),
      slug,
      price: Number(price).toFixed(2),
      salePrice: salePrice ? Number(salePrice).toFixed(2) : null,
      costPrice: costPrice ? Number(costPrice).toFixed(2) : null,
      description: description ? description.trim() : null,
      metaTitle: metaTitle ? metaTitle.trim() : null,
      metaDescription: metaDescription ? metaDescription.trim() : null,
      categoryId: Number(categoryId),
      brandId: Number(brandId),
      status: isActive === 'true' || isActive === true ? 'ACTIVE' : 'INACTIVE',
      isFeatured: isFeatured === 'true' || isFeatured === true ? true : false,
    };

    // Xử lý trạng thái trực tiếp nếu có
    if (req.body.status && ['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK'].includes(req.body.status.toUpperCase())) {
      productData.status = req.body.status.toUpperCase();
    }

    // Chỉ thêm image nếu có
    if (imageUrl) {
      productData.imageUrl = imageUrl;
      productData.imagePublicId = imagePublicId;
    }

    logger.debug('Creating product', { name: productData.name });

    const created = await prisma.product.create({
      data: productData,
      include: includeBasic
    });

    logger.success('Product created', { id: created.id, name: created.name });
    logger.end(context.path, { id: created.id });

    // Gửi thông báo real-time đến tất cả client là tạo sản phẩm mới
    emitProductCreated(created);

    return res.status(201).json(created);
  } catch (error) {
    logger.error('Failed to create product', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    const payload = { message: 'Server error' };
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};

export const updateProduct = async (req, res) => {
  const context = { path: 'admin.products.update' };
  try {
    logger.start(context.path, { id: req.params.id });

    const id = Number(req.params.id);
    const found = await prisma.product.findUnique({ where: { id } });
    if (!found) {
      logger.warn('Product not found', { id });
      return res.status(404).json({ message: 'Not found' });
    }

    const data = { ...req.body };

    // Xử lý image upload
    if (req.file) {
      // Xóa ảnh cũ nếu có
      if (found.imagePublicId) {
        await cloudinary.uploader.destroy(found.imagePublicId, { invalidate: true });
        logger.debug('Old image deleted', { publicId: found.imagePublicId });
      }
      data.imageUrl = req.file.path;
      data.imagePublicId = req.file.filename;
      logger.debug('New image uploaded', { imageUrl: data.imageUrl });
    }

    if (data.name && !data.slug) data.slug = slugify(data.name);

    if (data.slug && data.slug !== found.slug) {
      const dup = await prisma.product.findUnique({ where: { slug: data.slug } });
      if (dup) {
        logger.warn('Slug conflict', { slug: data.slug });
        return res.status(409).json({ message: 'Slug already exists' });
      }
    }

    if (data.categoryId) {
      const cat = await prisma.category.findUnique({ where: { id: Number(data.categoryId) } });
      if (!cat) return res.status(400).json({ message: 'Invalid categoryId' });
      if (!cat.isActive) return res.status(400).json({ message: 'Không thể cập nhật sản phẩm với danh mục đã bị tắt' });
      data.categoryId = Number(data.categoryId);
    }

    if (data.brandId) {
      const br = await prisma.brand.findUnique({ where: { id: Number(data.brandId) } });
      if (!br) return res.status(400).json({ message: 'Invalid brandId' });
      data.brandId = Number(data.brandId);
    }

    // Xóa các field không còn tồn tại trong Product model
    delete data.stock;
    delete data.stockQuantity;
    delete data.minStockLevel;
    delete data.warranty;
    delete data.length;
    delete data.width;
    delete data.height;
    delete data.seatHeight;
    delete data.backHeight;
    delete data.depth;
    delete data.dimensionUnit;

    if (data.price !== undefined) {
      data.price = Number(data.price).toFixed(2);
    }

    if (data.salePrice !== undefined) {
      data.salePrice = data.salePrice ? Number(data.salePrice).toFixed(2) : null;
    }

    if (data.costPrice !== undefined) {
      data.costPrice = data.costPrice ? Number(data.costPrice).toFixed(2) : null;
    }

    // ✅ VALIDATION: Kiểm tra salePrice phải nhỏ hơn price khi update
    // Lấy giá hiện tại từ DB nếu không update
    const finalPrice = data.price !== undefined ? Number(data.price) : Number(found.price);
    const finalSalePrice = data.salePrice !== undefined ? (data.salePrice ? Number(data.salePrice) : null) : (found.salePrice ? Number(found.salePrice) : null);

    if (finalSalePrice && finalSalePrice >= finalPrice) {
      logger.warn('Invalid salePrice on update', { finalPrice, finalSalePrice });
      return res.status(400).json({
        success: false,
        message: 'Giá khuyến mãi phải nhỏ hơn giá gốc'
      });
    }

    // Xử lý trạng thái từ isActive
    if (data.isActive !== undefined) {
      data.status = data.isActive === 'true' || data.isActive === true ? 'ACTIVE' : 'INACTIVE';
      delete data.isActive;
    }

    // Xử lý trường isFeatured
    if (data.isFeatured !== undefined) {
      data.isFeatured = data.isFeatured === 'true' || data.isFeatured === true ? true : false;
    }

    // Xử lý trạng thái trực tiếp nếu có
    if (data.status && ['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK'].includes(data.status.toUpperCase())) {
      data.status = data.status.toUpperCase();
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
      include: includeBasic
    });

    logger.success('Product updated', { id, name: updated.name });
    logger.end(context.path, { id });

    // Gửi thông báo real-time đến tất cả client là cập nhật sản phẩm
    emitProductUpdated(updated);

    return res.json(updated);
  } catch (error) {
    logger.error('Failed to update product', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    const payload = { message: 'Server error' };
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};

export const deleteProduct = async (req, res) => {
  const context = { path: 'admin.products.delete' };
  try {
    logger.start(context.path, { id: req.params.id });

    const id = Number(req.params.id);
    const found = await prisma.product.findUnique({
      where: { id },
      include: {
        orderItems: { take: 1 }, // Chỉ cần kiểm tra có đơn hàng không
        images: true,
        variants: true
      }
    });

    if (!found) {
      logger.warn('Product not found', { id });
      return res.status(404).json({ message: 'Not found' });
    }

    // Kiểm tra xem sản phẩm có trong đơn hàng không (ưu tiên kiểm tra đơn hàng trước)
    // Nếu có thì không cho xóa vì cần giữ lịch sử đơn hàng
    if (found.orderItems && found.orderItems.length > 0) {
      logger.warn('Cannot delete product with orders', { id });
      return res.status(400).json({
        message: 'Không thể xóa sản phẩm đã có đơn hàng liên quan'
      });
    }

    // Kiểm tra xem sản phẩm có biến thể không
    // Nếu có biến thể thì không cho xóa để tránh mất dữ liệu quan trọng
    if (found.variants && found.variants.length > 0) {
      logger.warn('Cannot delete product with variants', { id, variantCount: found.variants.length });
      return res.status(400).json({
        message: 'Không thể xóa sản phẩm đã có biến thể. Vui lòng xóa  biến thể trước.'
      });
    }

    // Xóa trong transaction để đảm bảo tính toàn vẹn
    await prisma.$transaction(async (tx) => {
      // 1. Xóa tất cả ảnh sản phẩm từ Cloudinary
      const allImages = found.images || [];
      for (const image of allImages) {
        if (image.imagePublicId) {
          try {
            await cloudinary.uploader.destroy(image.imagePublicId, { invalidate: true });
            logger.debug('Product image deleted from Cloudinary', { publicId: image.imagePublicId });
          } catch (cloudError) {
            logger.warn('Failed to delete image from Cloudinary', {
              publicId: image.imagePublicId,
              error: cloudError.message
            });
            // Tiếp tục xóa dù lỗi Cloudinary
          }
        }
      }

      // 2. Xóa ảnh chính từ Cloudinary nếu có
      if (found.imagePublicId) {
        try {
          await cloudinary.uploader.destroy(found.imagePublicId, { invalidate: true });
          logger.debug('Primary image deleted from Cloudinary', { publicId: found.imagePublicId });
        } catch (cloudError) {
          logger.warn('Failed to delete primary image from Cloudinary', {
            publicId: found.imagePublicId,
            error: cloudError.message
          });
        }
      }

      // 3. Xóa các bản ghi liên quan (variants sẽ tự xóa do onDelete: Cascade)
      // Xóa wishlist items
      await tx.wishlist.deleteMany({ where: { productId: id } });

      // Xóa shopping cart items
      await tx.shoppingCart.deleteMany({ where: { productId: id } });

      // Xóa product images
      await tx.productImage.deleteMany({ where: { productId: id } });

      // Xóa product comments
      await tx.productComment.deleteMany({ where: { productId: id } });

      // Xóa product reviews
      await tx.productReview.deleteMany({ where: { productId: id } });

      // 4. Cuối cùng xóa sản phẩm (variants sẽ tự xóa do cascade)
      await tx.product.delete({ where: { id } });
    });

    logger.success('Product deleted', { id, name: found.name });
    logger.end(context.path, { id });

    // Gửi thông báo real-time đến tất cả client là xóa sản phẩm
    emitProductDeleted(id);

    return res.json({ success: true, message: 'Xóa sản phẩm thành công' });
  } catch (error) {
    logger.error('Failed to delete product', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });

    // Kiểm tra lỗi foreign key constraint
    if (error.code === 'P2003' || error.message.includes('Foreign key constraint')) {
      return res.status(400).json({
        message: 'Không thể xóa sản phẩm vì đang được sử dụng trong hệ thống'
      });
    }

    const payload = { message: 'Server error' };
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};

// Cập nhật ảnh chính của product
export const updateProductPrimaryImage = async (req, res) => {
  const context = { path: 'admin.products.updatePrimaryImage' };
  try {
    logger.start(context.path, { productId: req.params.id });

    const productId = Number(req.params.id);
    const { imageUrl, imagePublicId } = req.body;

    // Cho phép null để xóa ảnh (khi không còn ảnh nào)
    // Nếu có imageUrl thì phải có imagePublicId
    if (imageUrl && !imagePublicId) {
      logger.warn('Missing imagePublicId', { productId });
      return res.status(400).json({ message: 'imagePublicId is required when imageUrl is provided' });
    }

    // Kiểm tra product tồn tại
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      logger.warn('Product not found', { productId });
      return res.status(404).json({ message: 'Product not found' });
    }

    // Nếu xóa ảnh (imageUrl là null), xóa luôn ảnh cũ trên Cloudinary nếu có
    if (!imageUrl && product.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(product.imagePublicId, { invalidate: true });
        logger.debug('Old image deleted', { publicId: product.imagePublicId });
      } catch (cloudinaryError) {
        logger.warn('Error deleting image from Cloudinary', { error: cloudinaryError.message });
        // Không throw error, tiếp tục xóa trong DB
      }
    }

    logger.debug('Updating product primary image', { productId, imageUrl });

    // Cập nhật ảnh chính (có thể là null để xóa ảnh)
    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        imageUrl: imageUrl || null,
        imagePublicId: imagePublicId || null
      }
    });

    logger.success('Product primary image updated', { productId, imageUrl: updated.imageUrl });
    logger.end(context.path, { productId });
    return res.json(updated);
  } catch (error) {
    logger.error('Failed to update product primary image', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    const payload = { message: 'Server error' };
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};


// Function lấy sản phẩm theo category với phân trang và sắp xếp (API mới được thêm)
export const getProductsByCategory = async (req, res) => {
  // Tạo context object để log và debug
  const context = { path: 'admin.products.getByCategory' };
  try {
    logger.start(context.path, { categoryId: req.params.categoryId, query: req.query });

    // Lấy categoryId từ URL params (ví dụ: /api/admin/products/category/1)
    const { categoryId } = req.params;
    // Lấy các tham số phân trang và sắp xếp từ query string với giá trị mặc định
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Validation: Kiểm tra categoryId có được cung cấp không
    if (!categoryId) {
      logger.warn('Missing categoryId');
      return res.status(400).json({ message: 'categoryId is required' });
    }

    // Kiểm tra category có tồn tại trong database không
    const category = await prisma.category.findUnique({
      where: { id: Number(categoryId) },
      select: { id: true, name: true, slug: true, isActive: true } // Thêm isActive để kiểm tra
    });
    if (!category) {
      logger.warn('Category not found', { categoryId });
      return res.status(404).json({ message: 'Category not found' });
    }

    // ✅ Nếu category bị tắt (isActive = false) → Không hiển thị sản phẩm
    // Chỉ admin mới thấy sản phẩm từ category bị tắt
    const isPublicRoute = !req.user;
    if (isPublicRoute && !category.isActive) {
      logger.warn('Category is inactive', { categoryId });
      return res.json({
        code: 200,
        message: "Danh mục này đã bị tạm dừng",
        data: {
          products: [],
          pagination: {
            total: 0,
            page: Number(page),
            limit: Number(limit),
            totalPages: 0
          },
          category: {
            id: category.id,
            name: category.name,
            slug: category.slug
          }
        }
      });
    }

    // Tính toán offset và limit cho phân trang
    const skip = (Number(page) - 1) * Number(limit); // Bỏ qua bao nhiêu bản ghi
    const take = Number(limit); // Lấy bao nhiêu bản ghi

    // Thực hiện 2 query song song để tối ưu performance
    const [products, total] = await Promise.all([
      // Query 1: Lấy danh sách sản phẩm trong category với phân trang
      prisma.product.findMany({
        where: {
          categoryId: Number(categoryId), // Lọc theo category ID
          status: 'ACTIVE' // Chỉ lấy sản phẩm đang hoạt động, bỏ qua sản phẩm đã xóa/tạm dừng
        },
        orderBy: { [sortBy]: sortOrder }, // Sắp xếp theo field và thứ tự được chỉ định
        skip, // Bỏ qua các bản ghi của trang trước
        take, // Lấy đúng số lượng bản ghi của trang hiện tại
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true } }
        }
      }),
      // Query 2: Đếm tổng số sản phẩm trong category (chỉ sản phẩm ACTIVE)
      prisma.product.count({
        where: {
          categoryId: Number(categoryId),
          status: 'ACTIVE'
        }
      })
    ]);

    logger.success('Products by category fetched', { categoryId, count: products.length, total });

    // Trả về dữ liệu theo format chuẩn cho UI
    const payload = {
      success: true, // Flag thành công
      data: {
        category, // Thông tin category
        products, // Danh sách sản phẩm
        pagination: {
          page: Number(page), // Trang hiện tại
          limit: Number(limit), // Số sản phẩm mỗi trang
          total, // Tổng số sản phẩm
          totalPages: Math.ceil(total / Number(limit)) // Tổng số trang (làm tròn lên)
        }
      }
    };

    logger.end(context.path, { categoryId, total: products.length });
    return res.json(payload);
  } catch (error) {
    // Xử lý lỗi và log
    logger.error('Failed to fetch products by category', {
      path: context.path,
      error: error.message,
      stack: error.stack
    });
    const payload = { success: false, message: 'Server error' };
    // Chỉ hiển thị chi tiết lỗi trong môi trường development
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};
