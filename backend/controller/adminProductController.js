// Import các thư viện cần thiết
import prisma from '../config/prisma.js'; // Prisma client để kết nối database
import { slugify } from '../utils/slugify.js'; // Utility function để tạo slug từ tên sản phẩm
import cloudinary from '../config/cloudinary.js'; // Cloudinary client để upload ảnh

// Cấu hình include cơ bản cho các query sản phẩm
// Chỉ lấy thông tin cần thiết của category và brand để tối ưu performance
const includeBasic = {
  category: { select: { id: true, name: true, slug: true } }, // Chỉ lấy id, name, slug của category
  brand: { select: { id: true, name: true } } // Chỉ lấy id, name của brand
};

// Function lấy danh sách sản phẩm với phân trang và tìm kiếm
export const listProducts = async (req, res) => {
  // Tạo context object để log và debug
  const context = { path: 'admin.products.list', query: req.query };
  try {
    console.log('START', context);
    
    // Lấy các tham số từ query string với giá trị mặc định
    const { page = 1, limit = 10, q, categoryId, brandId } = req.query;
    
    // Xây dựng điều kiện WHERE động dựa trên các filter
    const and = []; // Mảng chứa các điều kiện AND
    if (q) and.push({ name: { contains: q, mode: 'insensitive' } }); // Tìm kiếm theo tên (không phân biệt hoa thường)
    if (categoryId) and.push({ categoryId: Number(categoryId) }); // Lọc theo category ID
    if (brandId) and.push({ brandId: Number(brandId) }); // Lọc theo brand ID
    const where = and.length ? { AND: and } : undefined; // Nếu có điều kiện thì tạo WHERE clause

    // Thực hiện 2 query song song để tối ưu performance
    const [items, total] = await Promise.all([
      // Query 1: Lấy danh sách sản phẩm với phân trang
      prisma.product.findMany({
        where, // Điều kiện lọc
        orderBy: { createdAt: 'desc' }, // Sắp xếp theo thời gian tạo (mới nhất trước)
        skip: (Number(page) - 1) * Number(limit), // Bỏ qua các bản ghi của trang trước
        take: Number(limit), // Lấy đúng số lượng bản ghi của trang hiện tại
        include: includeBasic // Include thông tin category và brand
      }),
      // Query 2: Đếm tổng số sản phẩm thỏa mãn điều kiện
      prisma.product.count({ where })
    ]);

    // Tạo response payload với thông tin phân trang
    const payload = { items, total, page: Number(page), limit: Number(limit) };
    console.log('END', { ...context, total: payload.total });
    return res.json(payload);
  } catch (error) {
    // Xử lý lỗi và log
    console.error('ERROR', { ...context, error: error.message });
    const payload = { message: 'Server error' };
    // Chỉ hiển thị chi tiết lỗi trong môi trường development
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};

// Function lấy chi tiết một sản phẩm theo ID
export const getProduct = async (req, res) => {
  // Tạo context object để log và debug
  const context = { path: 'admin.products.get', params: req.params };
  try {
    console.log('START', context);
    
    // Lấy ID từ URL params và chuyển đổi sang number
    const id = Number(req.params.id);
    
    // Tìm sản phẩm theo ID với thông tin category và brand
    const product = await prisma.product.findUnique({ 
      where: { id }, 
      include: includeBasic 
    });
    
    // Kiểm tra sản phẩm có tồn tại không
    if (!product) {
      console.warn('NOT_FOUND', context);
      return res.status(404).json({ message: 'Not found' });
    }
    
    console.log('END', { ...context, id });
    return res.json(product);
  } catch (error) {
    // Xử lý lỗi và log
    console.error('ERROR', { ...context, error: error.message });
    const payload = { message: 'Server error' };
    // Chỉ hiển thị chi tiết lỗi trong môi trường development
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};

export const createProduct = async (req, res) => {
  const context = { path: 'admin.products.create', body: req.body };
  try {
    console.log('START', context);
    const {
      name, slug: slugInput, sku, price, stock, description,
      categoryId, brandId, isActive
    } = req.body;

    // Xử lý image upload
    const imageUrl = req.file ? req.file.path : null;
    const imagePublicId = req.file ? req.file.filename : null;
    
    if (req.file) {
      console.log('Image uploaded to Cloudinary:', { imageUrl, imagePublicId });
    }

    const [cat, br] = await Promise.all([
      prisma.category.findUnique({ where: { id: Number(categoryId) } }),
      prisma.brand.findUnique({ where: { id: Number(brandId) } })
    ]);
    if (!cat) return res.status(400).json({ message: 'Invalid categoryId' });
    if (!br) return res.status(400).json({ message: 'Invalid brandId' });

    const slug = slugInput?.trim() || slugify(name);

    const [dupSlug, dupSku] = await Promise.all([
      prisma.product.findUnique({ where: { slug } }),
      prisma.product.findUnique({ where: { sku } })
    ]);
    if (dupSlug) {
      console.warn('CONFLICT_SLUG', { ...context, slug });
      return res.status(409).json({ message: 'Slug already exists' });
    }
    if (dupSku) {
      console.warn('CONFLICT_SKU', { ...context, sku });
      return res.status(409).json({ message: 'SKU already exists' });
    }

    const created = await prisma.product.create({
      data: {
        name,
        slug,
        sku,
        price: String(price),
        stockQuantity: stock ?? 0,
        description: description || null,
        categoryId: Number(categoryId),
        brandId: Number(brandId),
        status: 'ACTIVE',
        isFeatured: false,
        imageUrl, // Thêm mới
        imagePublicId, // Thêm mới
      },
      include: includeBasic
    });

    console.log('END', { ...context, id: created.id });
    return res.status(201).json(created);
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
    const payload = { message: 'Server error' };
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};

export const updateProduct = async (req, res) => {
  const context = { path: 'admin.products.update', params: req.params, body: req.body };
  try {
    console.log('START', context);
    const id = Number(req.params.id);
    const found = await prisma.product.findUnique({ where: { id } });
    if (!found) {
      console.warn('NOT_FOUND', context);
      return res.status(404).json({ message: 'Not found' });
    }

    const data = { ...req.body };
    
    // Xử lý image upload
    if (req.file) {
      // Xóa ảnh cũ nếu có
      if (found.imagePublicId) {
        await cloudinary.uploader.destroy(found.imagePublicId, { invalidate: true });
        console.log('Old image deleted from Cloudinary:', found.imagePublicId);
      }
      data.imageUrl = req.file.path;
      data.imagePublicId = req.file.filename;
      console.log('New image uploaded to Cloudinary:', { imageUrl: data.imageUrl, imagePublicId: data.imagePublicId });
    }

    if (data.name && !data.slug) data.slug = slugify(data.name);

    if (data.slug && data.slug !== found.slug) {
      const dup = await prisma.product.findUnique({ where: { slug: data.slug } });
      if (dup) {
        console.warn('CONFLICT_SLUG', { ...context, slug: data.slug });
        return res.status(409).json({ message: 'Slug already exists' });
      }
    }

    if (data.sku && data.sku !== found.sku) {
      const dupSku = await prisma.product.findUnique({ where: { sku: data.sku } });
      if (dupSku) {
        console.warn('CONFLICT_SKU', { ...context, sku: data.sku });
        return res.status(409).json({ message: 'SKU already exists' });
      }
    }

    if (data.categoryId) {
      const cat = await prisma.category.findUnique({ where: { id: Number(data.categoryId) } });
      if (!cat) return res.status(400).json({ message: 'Invalid categoryId' });
      data.categoryId = Number(data.categoryId);
    }

    if (data.brandId) {
      const br = await prisma.brand.findUnique({ where: { id: Number(data.brandId) } });
      if (!br) return res.status(400).json({ message: 'Invalid brandId' });
      data.brandId = Number(data.brandId);
    }

    if (data.stock !== undefined) {
      data.stockQuantity = data.stock;
      delete data.stock;
    }

    if (data.price !== undefined) {
      data.price = String(data.price);
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
      include: includeBasic
    });

    console.log('END', { ...context, id });
    return res.json(updated);
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
    const payload = { message: 'Server error' };
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};

export const deleteProduct = async (req, res) => {
  const context = { path: 'admin.products.delete', params: req.params };
  try {
    console.log('START', context);
    const id = Number(req.params.id);
    const found = await prisma.product.findUnique({ where: { id } });
    if (!found) {
      console.warn('NOT_FOUND', context);
      return res.status(404).json({ message: 'Not found' });
    }

    // Xóa ảnh Cloudinary nếu có
    if (found.imagePublicId) {
      await cloudinary.uploader.destroy(found.imagePublicId, { invalidate: true });
    }

    await prisma.product.delete({ where: { id } });
    console.log('END', { ...context, id });
    return res.json({ success: true });
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
    const payload = { message: 'Server error' };
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};

// Cập nhật ảnh chính của product
export const updateProductPrimaryImage = async (req, res) => {
  const context = { path: 'admin.products.updatePrimaryImage', params: req.params, body: req.body };
  try {
    console.log('START', context);
    const productId = Number(req.params.id);
    const { imageUrl, imagePublicId } = req.body;

    // Validation dữ liệu đầu vào
    if (!imageUrl) {
      console.warn('MISSING_IMAGE_URL', { ...context });
      return res.status(400).json({ message: 'imageUrl is required' });
    }

    if (!imagePublicId) {
      console.warn('MISSING_IMAGE_PUBLIC_ID', { ...context });
      return res.status(400).json({ message: 'imagePublicId is required' });
    }

    // Kiểm tra product tồn tại
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      console.warn('PRODUCT_NOT_FOUND', { ...context, productId });
      return res.status(404).json({ message: 'Product not found' });
    }

    console.log('Updating product primary image:', { productId, imageUrl, imagePublicId });

    // Cập nhật ảnh chính
    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        imageUrl,
        imagePublicId
      }
    });

    console.log('END', { ...context, productId, imageUrl, updated: { id: updated.id, imageUrl: updated.imageUrl } });
    return res.json(updated);
  } catch (error) {
    console.error('ERROR', { ...context, error: error.message });
    const payload = { message: 'Server error' };
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};

// Function lấy sản phẩm theo category với phân trang và sắp xếp (API mới được thêm)
export const getProductsByCategory = async (req, res) => {
  // Tạo context object để log và debug
  const context = { path: 'admin.products.getByCategory', query: req.query };
  try {
    console.log('START', context);
    
    // Lấy categoryId từ URL params (ví dụ: /api/admin/products/category/1)
    const { categoryId } = req.params;
    // Lấy các tham số phân trang và sắp xếp từ query string với giá trị mặc định
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Validation: Kiểm tra categoryId có được cung cấp không
    if (!categoryId) {
      console.warn('MISSING_CATEGORY_ID', { ...context });
      return res.status(400).json({ message: 'categoryId is required' });
    }

    // Kiểm tra category có tồn tại trong database không
    const category = await prisma.category.findUnique({ 
      where: { id: Number(categoryId) },
      select: { id: true, name: true, slug: true } // Chỉ lấy các field cần thiết để tối ưu performance
    });
    if (!category) {
      console.warn('CATEGORY_NOT_FOUND', { ...context, categoryId });
      return res.status(404).json({ message: 'Category not found' });
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

    console.log('FOUND_PRODUCTS', { ...context, categoryId, count: products.length, total });

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
    
    console.log('END', { ...context, categoryId, total: products.length });
    return res.json(payload);
  } catch (error) {
    // Xử lý lỗi và log
    console.error('ERROR', { ...context, error: error.message });
    const payload = { success: false, message: 'Server error' };
    // Chỉ hiển thị chi tiết lỗi trong môi trường development
    if (process.env.NODE_ENV !== 'production') payload.error = error.message;
    return res.status(500).json(payload);
  }
};