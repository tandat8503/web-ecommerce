
import prisma from '../config/prisma.js';

/**
 * Tạo FullText index cho bảng products (nếu chưa có)
 */
export async function ensureFullTextIndex() {
  try {
    console.log('Đang kiểm tra FullText index cho bảng products...');
    
    const checkIndex = await prisma.$queryRawUnsafe(`
      SHOW INDEX FROM products WHERE Key_name = 'ft_product_search'
    `);
    
    if (checkIndex.length > 0) {
      console.log('FullText index đã tồn tại!');
      return true;
    }
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE products 
      ADD FULLTEXT INDEX ft_product_search (name, description)
    `);
    
    console.log('Đã tạo FullText index thành công!');
    return true;
    
  } catch (error) {
    console.error('Lỗi khi tạo FullText index:', error.message);
    if (error.message.includes('Duplicate key name') || error.message.includes('already exists')) {
      console.log('FullText index đã tồn tại!');
      return true;
    }
    console.warn('FullText index chưa được tạo, search có thể chậm hơn');
    return false;
  }
}

/**
 * Sanitize search term
 */
function sanitizeSearchTerm(searchTerm) {
  if (!searchTerm || typeof searchTerm !== 'string') {
    return '';
  }
  
  let sanitized = searchTerm
    .trim()
    .replace(/[+\-><()~*\"@]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return sanitized;
}

/**
 * Tạo search pattern cho MySQL FullText BOOLEAN MODE
 */
function createSearchPattern(searchTerm) {
  if (!searchTerm) return '';
  
  const words = searchTerm.split(' ').filter(w => w.length > 0);
  
  if (words.length === 0) return '';
  
  const pattern = words.map(word => {
    if (word.length < 3) {
      return `+${word}`;
    }
    return `+${word}*`;
  }).join(' ');
  
  return pattern;
}

/**
 * ✅ FIXED VERSION - Tìm kiếm sản phẩm bằng FullText Search
 */
export async function searchProductsWithFullText({
  searchTerm,
  categoryId,
  brandId,
  status,
  isPublicRoute = false,
  skip = 0,
  limit = 10,
  minPrice,
  maxPrice,
  inStock = false,
  color,
  material,
  sortBy = 'relevance',
}) { 
  try {
    // Sanitize search term
    const sanitizedTerm = sanitizeSearchTerm(searchTerm);
    
    if (!sanitizedTerm) {
      throw new Error('Search term is empty after sanitization');
    }
    
    // Tạo search pattern cho BOOLEAN MODE
    const searchPattern = createSearchPattern(sanitizedTerm);
    
    // ✅ Escape single quotes cho LIKE queries
    const escapedTerm = sanitizedTerm.replace(/'/g, "''");
    
    // Xây dựng điều kiện WHERE
    const whereConditions = [];

    // ✅ Fulltext search condition - FIXED
    whereConditions.push(`(
      MATCH(p.name, p.description) AGAINST('${searchPattern}' IN BOOLEAN MODE)
      OR c.name LIKE '%${escapedTerm}%'
      OR b.name LIKE '%${escapedTerm}%'
    )`);
   
    // Filter theo category
    if (categoryId) {
      whereConditions.push(`p.category_id = ${Number(categoryId)}`);
    }

    // Filter theo brand
    if (brandId) {
      whereConditions.push(`p.brand_id = ${Number(brandId)}`);
    }
    
    // Filter theo status
    if (status) {
      whereConditions.push(`p.status = '${status}'`);
    }
    
    // ✅ Filter theo price range - FIXED typo
    if (minPrice !== undefined && minPrice !== null) {
      whereConditions.push(`p.price >= ${Number(minPrice)}`);
    }
    if (maxPrice !== undefined && maxPrice !== null) {
      whereConditions.push(`p.price <= ${Number(maxPrice)}`);
    }
   
    // Filter sản phẩm còn hàng
    if (inStock) {
      whereConditions.push(`EXISTS(
        SELECT 1 FROM product_variants pv
        WHERE pv.product_id = p.id
        AND pv.stock_quantity > 0
        AND pv.is_active = true
      )`);
    }

    // Filter theo color
    if (color && color.trim()) {
      const safeColor = color.replace(/'/g, "''");
      whereConditions.push(`EXISTS(
        SELECT 1 FROM product_variants pv
        WHERE pv.product_id = p.id
        AND pv.color = '${safeColor}'
        AND pv.is_active = true
      )`);
    }
    
    // Filter theo material
    if (material && material.trim()) {
      const safeMaterial = material.replace(/'/g, "''");
      whereConditions.push(`EXISTS(
        SELECT 1 FROM product_variants pv
        WHERE pv.product_id = p.id
        AND pv.material = '${safeMaterial}'
        AND pv.is_active = true
      )`);
    }

    // Public route chỉ lấy ACTIVE products và từ category đang hoạt động
    if (isPublicRoute) {
      whereConditions.push(`p.status = 'ACTIVE'`);
      // ✅ Chỉ lấy sản phẩm từ category đang hoạt động (isActive = true)
      whereConditions.push(`c.is_active = true`);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // ✅ Tính relevance score với trọng số - FIXED
    const relevanceScore = `(
      MATCH(p.name, p.description) AGAINST('${searchPattern}' IN BOOLEAN MODE) * 3 +
      IF(c.name LIKE '%${escapedTerm}%', 2, 0) +
      IF(b.name LIKE '%${escapedTerm}%', 1.5, 0) +
      IF(p.name LIKE '%${escapedTerm}%', 1, 0)
    )`;

    // Xây dựng ORDER BY clause
    let orderByClause = '';
    switch(sortBy) {
      case 'price_asc':
        orderByClause = 'ORDER BY p.price ASC';
        break;
      case 'price_desc':
        orderByClause = 'ORDER BY p.price DESC';
        break;
      case 'newest':
        orderByClause = 'ORDER BY p.created_at DESC';
        break;
      case 'oldest':
        orderByClause = 'ORDER BY p.created_at ASC';
        break;
      case 'name_asc':
        orderByClause = 'ORDER BY p.name ASC';
        break;
      case 'name_desc':
        orderByClause = 'ORDER BY p.name DESC';
        break;
      case 'relevance':
      default:
        orderByClause = `ORDER BY ${relevanceScore} DESC, p.created_at DESC`;
        break;
    }
    
    // Query để lấy items với JOIN
    const itemsQuery = `
      SELECT DISTINCT p.*, 
            c.name as category_name,
            b.name as brand_name,
            ${relevanceScore} as relevance
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      ${whereClause}
      ${orderByClause}
      LIMIT ${Number(limit)} OFFSET ${Number(skip)}
    `;

    // Query để đếm total
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      ${whereClause}
    `;
    
    // Thực hiện queries
    const [itemsResult, countResult] = await Promise.all([
      prisma.$queryRawUnsafe(itemsQuery),
      prisma.$queryRawUnsafe(countQuery)
    ]);
    
    const rawItems = itemsResult || [];
    const total = Number(countResult[0]?.total || 0);
    
    // Lấy product IDs để query variants
    const productIds = rawItems.map(item => item.id);
    
    // Query variants cho các products này
    const variants = productIds.length > 0 ? await prisma.productVariant.findMany({
      where: {
        productId: { in: productIds },
        isActive: true
      },
      select: {
        productId: true,
        stockQuantity: true
      }
    }) : [];
    
    // Nhóm variants theo productId và tính tổng stock
    const stockByProductId = {};
    variants.forEach(variant => {
      if (!stockByProductId[variant.productId]) {
        stockByProductId[variant.productId] = 0;
      }
      stockByProductId[variant.productId] += variant.stockQuantity || 0;
    });
    
    // ✅ Convert snake_case sang camelCase
    const items = rawItems.map(item => {
      return {
        id: item.id,
        name: item.name,
        slug: item.slug,
        description: item.description,
        categoryId: item.category_id,
        brandId: item.brand_id,
        status: item.status,
        isFeatured: Boolean(item.is_featured),
        price: Number(item.price),
        salePrice: item.sale_price ? Number(item.sale_price) : null,
        costPrice: item.cost_price ? Number(item.cost_price) : null,
        imageUrl: item.image_url,
        imagePublicId: item.image_public_id,
        metaTitle: item.meta_title,
        metaDescription: item.meta_description,
        viewCount: item.view_count,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        stockQuantity: stockByProductId[item.id] || 0,
        relevance: Number(item.relevance || 0)
      };
    });
    
    // Include category và brand cho mỗi item
    const itemsWithRelations = await Promise.all(items.map(async (item) => {
      const [category, brand] = await Promise.all([
        prisma.category.findUnique({ 
          where: { id: item.categoryId },
          select: { id: true, name: true, slug: true }
        }),
        prisma.brand.findUnique({ 
          where: { id: item.brandId },
          select: { id: true, name: true }
        })
      ]);
      
      return {
        ...item,
        category,
        brand
      };
    }));
    
    return {
      items: itemsWithRelations,
      total
    };
    
  } catch (error) {
    console.error('FullText search error:', error.message);
    throw error;
  }
}

