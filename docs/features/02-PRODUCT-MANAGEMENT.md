# Product Management System - Hệ Thống Quản Lý Sản Phẩm

## 📋 Tổng Quan

Hệ thống quản lý sản phẩm bao gồm:
- CRUD sản phẩm (Admin)
- Quản lý biến thể sản phẩm (Product Variants)
- Upload & quản lý hình ảnh (Cloudinary)
- Phân loại theo Categories & Brands
- Tìm kiếm & Lọc sản phẩm
- Quản lý tồn kho

---

## 🗄️ Database Schema

### Product Model
```prisma
model Product {
  id                Int              @id @default(autoincrement())
  name              String           @db.VarChar(255)
  slug              String           @unique @db.VarChar(255)
  description       String?          @db.Text
  price             Decimal          @db.Decimal(10, 2)
  comparePrice      Decimal?         @db.Decimal(10, 2) @map("compare_price")
  costPerItem       Decimal?         @db.Decimal(10, 2) @map("cost_per_item")
  
  // Images
  primaryImage      String?          @map("primary_image")
  imageUrl          String?          @map("image_url")
  imagePublicId     String?          @map("image_public_id")
  
  // Stock & Status
  stockQuantity     Int              @default(0) @map("stock_quantity")
  isActive          Boolean          @default(true) @map("is_active")
  isFeatured        Boolean          @default(false) @map("is_featured")
  
  // SEO
  metaTitle         String?          @db.VarChar(255) @map("meta_title")
  metaDescription   String?          @db.Text @map("meta_description")
  
  // Relations
  categoryId        Int              @map("category_id")
  category          Category         @relation(fields: [categoryId], references: [id])
  brandId           Int?             @map("brand_id")
  brand             Brand?           @relation(fields: [brandId], references: [id])
  
  variants          ProductVariant[]
  images            ProductImage[]
  reviews           ProductReview[]
  comments          ProductComment[]
  
  createdAt         DateTime         @default(now()) @map("created_at")
  updatedAt         DateTime         @updatedAt @map("updated_at")
  
  @@map("products")
  @@index([categoryId])
  @@index([brandId])
  @@index([slug])
}

model ProductVariant {
  id            Int      @id @default(autoincrement())
  productId     Int      @map("product_id")
  product       Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  sku           String?  @unique @db.VarChar(100)
  color         String?  @db.VarChar(50)
  size          String?  @db.VarChar(50)
  material      String?  @db.VarChar(100)
  
  // Dimensions (mm)
  width         Int?
  depth         Int?
  height        Int?
  weight        Int?     // gram
  
  // Pricing & Stock
  price         Decimal? @db.Decimal(10, 2)
  stockQuantity Int      @default(0) @map("stock_quantity")
  isActive      Boolean  @default(true) @map("is_active")
  
  // Image
  imageUrl      String?  @map("image_url")
  imagePublicId String?  @map("image_public_id")
  
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  
  @@map("product_variants")
  @@index([productId])
}

model ProductImage {
  id            Int      @id @default(autoincrement())
  productId     Int      @map("product_id")
  product       Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  imageUrl      String   @map("image_url")
  publicId      String   @map("public_id")
  displayOrder  Int      @default(0) @map("display_order")
  
  createdAt     DateTime @default(now()) @map("created_at")
  
  @@map("product_images")
  @@index([productId])
}

model Category {
  id          Int       @id @default(autoincrement())
  name        String    @db.VarChar(100)
  slug        String    @unique @db.VarChar(100)
  description String?   @db.Text
  imageUrl    String?   @map("image_url")
  isActive    Boolean   @default(true) @map("is_active")
  
  products    Product[]
  
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  @@map("categories")
}

model Brand {
  id          Int       @id @default(autoincrement())
  name        String    @db.VarChar(100)
  slug        String    @unique @db.VarChar(100)
  description String?   @db.Text
  logoUrl     String?   @map("logo_url")
  isActive    Boolean   @default(true) @map("is_active")
  
  products    Product[]
  
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  @@map("brands")
}
```

---

## 🔧 Backend Implementation

### 1. Controller: `controller/adminProductController.js`

#### Get All Products (Admin)
```javascript
export const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      categoryId,
      brandId,
      isActive,
      isFeatured,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (categoryId) where.categoryId = Number(categoryId);
    if (brandId) where.brandId = Number(brandId);
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (isFeatured !== undefined) where.isFeatured = isFeatured === 'true';

    // Get products with relations
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          variants: {
            select: {
              id: true,
              color: true,
              size: true,
              price: true,
              stockQuantity: true
            }
          },
          _count: {
            select: {
              reviews: true,
              variants: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: Number(limit)
      }),
      prisma.product.count({ where })
    ]);

    return res.json({
      success: true,
      data: {
        products,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get products error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách sản phẩm'
    });
  }
};
```

#### Create Product
```javascript
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      comparePrice,
      costPerItem,
      categoryId,
      brandId,
      stockQuantity,
      isActive,
      isFeatured,
      metaTitle,
      metaDescription
    } = req.body;

    // Validate required fields
    if (!name || !price || !categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc (name, price, categoryId)'
      });
    }

    // Generate slug
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check slug exists
    const existingProduct = await prisma.product.findUnique({
      where: { slug }
    });

    if (existingProduct) {
      return res.status(409).json({
        success: false,
        message: 'Sản phẩm với tên này đã tồn tại'
      });
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        price: Number(price),
        comparePrice: comparePrice ? Number(comparePrice) : null,
        costPerItem: costPerItem ? Number(costPerItem) : null,
        categoryId: Number(categoryId),
        brandId: brandId ? Number(brandId) : null,
        stockQuantity: stockQuantity ? Number(stockQuantity) : 0,
        isActive: isActive !== undefined ? isActive : true,
        isFeatured: isFeatured !== undefined ? isFeatured : false,
        metaTitle: metaTitle || name,
        metaDescription: metaDescription || description
      },
      include: {
        category: true,
        brand: true
      }
    });

    logger.info('Product created', { productId: product.id, name: product.name });

    return res.status(201).json({
      success: true,
      message: 'Tạo sản phẩm thành công',
      data: product
    });
  } catch (error) {
    logger.error('Create product error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo sản phẩm'
    });
  }
};
```

#### Update Product
```javascript
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id: Number(id) }
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    // Update slug if name changed
    if (updateData.name && updateData.name !== existingProduct.name) {
      updateData.slug = updateData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    // Convert numeric fields
    if (updateData.price) updateData.price = Number(updateData.price);
    if (updateData.comparePrice) updateData.comparePrice = Number(updateData.comparePrice);
    if (updateData.costPerItem) updateData.costPerItem = Number(updateData.costPerItem);
    if (updateData.stockQuantity) updateData.stockQuantity = Number(updateData.stockQuantity);
    if (updateData.categoryId) updateData.categoryId = Number(updateData.categoryId);
    if (updateData.brandId) updateData.brandId = Number(updateData.brandId);

    // Update product
    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        category: true,
        brand: true,
        variants: true
      }
    });

    logger.info('Product updated', { productId: product.id });

    return res.json({
      success: true,
      message: 'Cập nhật sản phẩm thành công',
      data: product
    });
  } catch (error) {
    logger.error('Update product error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật sản phẩm'
    });
  }
};
```

#### Delete Product
```javascript
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Check product exists
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: {
            reviews: true,
            variants: true
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm'
      });
    }

    // Soft delete if has reviews/variants
    if (product._count.reviews > 0 || product._count.variants > 0) {
      await prisma.product.update({
        where: { id: Number(id) },
        data: { isActive: false }
      });

      return res.json({
        success: true,
        message: 'Đã vô hiệu hóa sản phẩm (có dữ liệu liên quan)'
      });
    }

    // Hard delete if no relations
    await prisma.product.delete({
      where: { id: Number(id) }
    });

    logger.info('Product deleted', { productId: Number(id) });

    return res.json({
      success: true,
      message: 'Xóa sản phẩm thành công'
    });
  } catch (error) {
    logger.error('Delete product error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa sản phẩm'
    });
  }
};
```

#### Upload Product Image
```javascript
import { uploadToCloudinary, deleteFromCloudinary } from '../services/cloudinaryService.js';

export const uploadProductImage = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file; // Multer middleware

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Không có file được upload'
      });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(file.buffer, 'products');

    // Update product
    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: {
        primaryImage: result.secure_url,
        imageUrl: result.secure_url,
        imagePublicId: result.public_id
      }
    });

    // Delete old image if exists
    if (product.imagePublicId && product.imagePublicId !== result.public_id) {
      await deleteFromCloudinary(product.imagePublicId);
    }

    return res.json({
      success: true,
      message: 'Upload hình ảnh thành công',
      data: {
        imageUrl: result.secure_url,
        publicId: result.public_id
      }
    });
  } catch (error) {
    logger.error('Upload product image error', { error: error.message });
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi upload hình ảnh'
    });
  }
};
```

### 2. Service: `services/cloudinaryService.js`

```javascript
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload image to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {String} folder - Cloudinary folder name
 * @returns {Promise<Object>} Upload result
 */
export const uploadToCloudinary = (fileBuffer, folder = 'products') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `ecommerce/${folder}`,
        resource_type: 'auto',
        transformation: [
          { width: 1000, height: 1000, crop: 'limit' },
          { quality: 'auto:good' }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

/**
 * Delete image from Cloudinary
 * @param {String} publicId - Cloudinary public ID
 * @returns {Promise<Object>} Delete result
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    logger.error('Delete from Cloudinary error', { publicId, error: error.message });
    throw error;
  }
};
```

### 3. Routes: `routes/adminProductRoutes.js`

```javascript
import express from 'express';
import multer from 'multer';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage
} from '../controller/adminProductController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Multer configuration (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file hình ảnh'));
    }
  }
});

// Apply auth middleware
router.use(authenticate);
router.use(authorize('ADMIN'));

// Routes
router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.post('/:id/upload-image', upload.single('image'), uploadProductImage);

export default router;
```

---

## 🎨 Frontend Implementation

### 1. API Service: `src/api/adminProducts.js`

```javascript
import axiosClient from './axiosClient';

export const getProducts = (params) => {
  return axiosClient.get('/admin/products', { params });
};

export const getProductById = (id) => {
  return axiosClient.get(`/admin/products/${id}`);
};

export const createProduct = (data) => {
  return axiosClient.post('/admin/products', data);
};

export const updateProduct = (id, data) => {
  return axiosClient.put(`/admin/products/${id}`, data);
};

export const deleteProduct = (id) => {
  return axiosClient.delete(`/admin/products/${id}`);
};

export const uploadProductImage = (id, file) => {
  const formData = new FormData();
  formData.append('image', file);
  
  return axiosClient.post(`/admin/products/${id}/upload-image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
```

### 2. Product List Page: `src/pages/admin/products/ProductList.jsx`

```jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts, deleteProduct } from '@/api/adminProducts';
import { formatPrice } from '@/lib/utils';

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    categoryId: '',
    brandId: ''
  });
  
  const navigate = useNavigate();

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await getProducts(filters);
      setProducts(response.data.data.products);
      setPagination(response.data.data.pagination);
    } catch (error) {
      toast.error('Lỗi khi tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;
    
    try {
      await deleteProduct(id);
      toast.success('Xóa sản phẩm thành công');
      fetchProducts();
    } catch (error) {
      toast.error('Lỗi khi xóa sản phẩm');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quản Lý Sản Phẩm</h1>
        <button
          onClick={() => navigate('/admin/products/create')}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Thêm Sản Phẩm
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="Tìm kiếm sản phẩm..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
          className="border px-4 py-2 rounded"
        />
      </div>

      {/* Product Table */}
      <table className="w-full border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">Hình ảnh</th>
            <th className="p-3 text-left">Tên sản phẩm</th>
            <th className="p-3 text-left">Danh mục</th>
            <th className="p-3 text-right">Giá</th>
            <th className="p-3 text-center">Tồn kho</th>
            <th className="p-3 text-center">Trạng thái</th>
            <th className="p-3 text-center">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-t">
              <td className="p-3">
                <img
                  src={product.primaryImage || '/placeholder.jpg'}
                  alt={product.name}
                  className="w-16 h-16 object-cover rounded"
                />
              </td>
              <td className="p-3">{product.name}</td>
              <td className="p-3">{product.category?.name}</td>
              <td className="p-3 text-right">{formatPrice(product.price)}</td>
              <td className="p-3 text-center">{product.stockQuantity}</td>
              <td className="p-3 text-center">
                <span className={`px-2 py-1 rounded text-xs ${
                  product.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {product.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="p-3 text-center">
                <button
                  onClick={() => navigate(`/admin/products/${product.id}/edit`)}
                  className="text-blue-600 mr-2"
                >
                  Sửa
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="text-red-600"
                >
                  Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="mt-4 flex justify-center gap-2">
        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => setFilters({ ...filters, page })}
            className={`px-3 py-1 rounded ${
              page === filters.page ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            {page}
          </button>
        ))}
      </div>
    </div>
  );
}
```

### 3. Create/Edit Product Form: `src/pages/admin/products/ProductForm.jsx`

```jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createProduct, updateProduct, getProductById, uploadProductImage } from '@/api/adminProducts';
import { getCategories } from '@/api/adminCategories';
import { getBrands } from '@/api/adminBrands';

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    comparePrice: '',
    categoryId: '',
    brandId: '',
    stockQuantity: 0,
    isActive: true,
    isFeatured: false
  });

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchBrands();
    if (isEdit) fetchProduct();
  }, [id]);

  const fetchCategories = async () => {
    const response = await getCategories();
    setCategories(response.data.data.categories);
  };

  const fetchBrands = async () => {
    const response = await getBrands();
    setBrands(response.data.data);
  };

  const fetchProduct = async () => {
    const response = await getProductById(id);
    const product = response.data.data;
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      comparePrice: product.comparePrice || '',
      categoryId: product.categoryId,
      brandId: product.brandId || '',
      stockQuantity: product.stockQuantity,
      isActive: product.isActive,
      isFeatured: product.isFeatured
    });
    setImagePreview(product.primaryImage);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let productId = id;

      if (isEdit) {
        await updateProduct(id, formData);
        toast.success('Cập nhật sản phẩm thành công');
      } else {
        const response = await createProduct(formData);
        productId = response.data.data.id;
        toast.success('Tạo sản phẩm thành công');
      }

      // Upload image if selected
      if (imageFile) {
        await uploadProductImage(productId, imageFile);
      }

      navigate('/admin/products');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        {isEdit ? 'Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload */}
        <div>
          <label className="block mb-2 font-medium">Hình ảnh</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="mb-2"
          />
          {imagePreview && (
            <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded" />
          )}
        </div>

        {/* Name */}
        <div>
          <label className="block mb-2 font-medium">Tên sản phẩm *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full border px-4 py-2 rounded"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block mb-2 font-medium">Mô tả</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className="w-full border px-4 py-2 rounded"
          />
        </div>

        {/* Price & Compare Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 font-medium">Giá bán *</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
              className="w-full border px-4 py-2 rounded"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Giá so sánh</label>
            <input
              type="number"
              value={formData.comparePrice}
              onChange={(e) => setFormData({ ...formData, comparePrice: e.target.value })}
              className="w-full border px-4 py-2 rounded"
            />
          </div>
        </div>

        {/* Category & Brand */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 font-medium">Danh mục *</label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              required
              className="w-full border px-4 py-2 rounded"
            >
              <option value="">Chọn danh mục</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-2 font-medium">Thương hiệu</label>
            <select
              value={formData.brandId}
              onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
              className="w-full border px-4 py-2 rounded"
            >
              <option value="">Chọn thương hiệu</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stock Quantity */}
        <div>
          <label className="block mb-2 font-medium">Số lượng tồn kho</label>
          <input
            type="number"
            value={formData.stockQuantity}
            onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
            className="w-full border px-4 py-2 rounded"
          />
        </div>

        {/* Status Checkboxes */}
        <div className="flex gap-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="mr-2"
            />
            Kích hoạt
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isFeatured}
              onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
              className="mr-2"
            />
            Nổi bật
          </label>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded"
          >
            {loading ? 'Đang xử lý...' : (isEdit ? 'Cập nhật' : 'Tạo mới')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="bg-gray-300 px-6 py-2 rounded"
          >
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
}
```

---

## 🧪 Testing

### Test Create Product
```bash
curl -X POST http://localhost:5000/api/admin/products \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bàn làm việc gỗ sồi",
    "description": "Bàn làm việc cao cấp",
    "price": 5000000,
    "comparePrice": 6000000,
    "categoryId": 1,
    "stockQuantity": 10,
    "isActive": true
  }'
```

### Test Upload Image
```bash
curl -X POST http://localhost:5000/api/admin/products/1/upload-image \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -F "image=@/path/to/image.jpg"
```

---

## 📝 Environment Variables

```env
# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

---

## 🚀 Flow Diagram

```
Admin Create Product Flow:
1. Admin nhập thông tin sản phẩm → Frontend validate
2. POST /api/admin/products → Backend validate
3. Generate slug từ name
4. Check slug unique
5. Create product in DB
6. Return product data
7. If image selected:
   - Upload to Cloudinary
   - Update product with image URL
8. Redirect to product list

Admin Update Product Flow:
1. Admin sửa thông tin → Frontend
2. PUT /api/admin/products/:id
3. Check product exists
4. Update slug if name changed
5. Update product in DB
6. If new image:
   - Upload to Cloudinary
   - Delete old image
   - Update product
7. Return updated product

Admin Delete Product Flow:
1. Admin click delete → Confirm dialog
2. DELETE /api/admin/products/:id
3. Check product exists
4. If has reviews/variants:
   - Soft delete (set isActive = false)
5. Else:
   - Hard delete from DB
6. Return success → Refresh list
```

---

## ✅ Checklist

- [x] CRUD sản phẩm (Admin)
- [x] Upload hình ảnh (Cloudinary)
- [x] Quản lý categories & brands
- [x] Product variants
- [x] Stock management
- [x] Soft delete với relations
- [x] Search & filter
- [x] Pagination
- [x] Image optimization
- [x] Slug generation
- [x] SEO fields (meta title, description)
