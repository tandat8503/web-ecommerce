
import prisma from '../config/prisma.js';

/**
 * Tạo FullText index cho bảng products (nếu chưa có)
 * Nên chạy khi server khởi động
 */
export async function ensureFullTextIndex() {
  try {
    console.log('Đang kiểm tra FullText index cho bảng products...');
    
    // Kiểm tra xem index đã tồn tại chưa
    const checkIndex = await prisma.$queryRawUnsafe(`
      SHOW INDEX FROM products WHERE Key_name = 'ft_product_search'
    `);
    
    if (checkIndex.length > 0) {
      console.log('FullText index đã tồn tại!');
      return true;
    }
    
    // Thêm FullText index
    await prisma.$executeRawUnsafe(`
      ALTER TABLE products 
      ADD FULLTEXT INDEX ft_product_search (name, description)
    `);
    
    console.log('Đã tạo FullText index thành công!');
    console.log('Index: ft_product_search trên các cột (name, description)');
    return true;
    
  } catch (error) {
    console.error('Lỗi khi tạo FullText index:', error.message);
    
    // Nếu lỗi do index đã tồn tại
    if (error.message.includes('Duplicate key name') || error.message.includes('already exists')) {
      console.log('FullText index đã tồn tại!');
      return true;
    }
    
    // Log lỗi nhưng không throw để server vẫn chạy được
    console.warn('FullText index chưa được tạo, search có thể chậm hơn');
    return false;
  }
}

/**
 * Sanitize search term để tránh SQL injection và chuẩn hóa cho FullText search
 * @param {string} searchTerm - Từ khóa tìm kiếm
 * @returns {string} - Search term đã được sanitize
 */
function sanitizeSearchTerm(searchTerm) {
  if (!searchTerm || typeof searchTerm !== 'string') {
    return '';
  }
  
  // Loại bỏ các ký tự đặc biệt có thể gây lỗi SQL
  // Giữ lại khoảng trắng và chữ cái, số
  let sanitized = searchTerm
    .trim()
    .replace(/[+\-><()~*\"@]/g, ' ') // Loại bỏ ký tự đặc biệt của FullText
    .replace(/\s+/g, ' ') // Chuẩn hóa khoảng trắng
    .trim();
  
  return sanitized;
}

/**
 * Tạo search pattern cho MySQL FullText BOOLEAN MODE
 * @param {string} searchTerm - Từ khóa tìm kiếm đã được sanitize
 * @returns {string} - Search pattern cho BOOLEAN MODE
 */
function createSearchPattern(searchTerm) {
  if (!searchTerm) return '';
  
  // Tách thành các từ
  const words = searchTerm.split(' ').filter(w => w.length > 0);
  
  if (words.length === 0) return '';
  
  // Tạo pattern: +word* để tìm từ bắt đầu bằng word
  // + nghĩa là từ này PHẢI xuất hiện
  // * nghĩa là tìm từ bắt đầu bằng (wildcard)
  const pattern = words.map(word => {
    // Nếu từ quá ngắn (< 3 ký tự), không dùng wildcard
    if (word.length < 3) {
      return `+${word}`;
    }
    return `+${word}*`;
  }).join(' ');
  
  return pattern;
}

/**
 * Tìm kiếm sản phẩm bằng FullText Search
 * @param {Object} options - Tùy chọn tìm kiếm
 * @param {string} options.searchTerm - Từ khóa tìm kiếm
 * @param {number} options.categoryId - ID danh mục (optional)
 * @param {number} options.brandId - ID thương hiệu (optional)
 * @param {string} options.status - Trạng thái sản phẩm (optional)
 * @param {boolean} options.isPublicRoute - Có phải public route không (chỉ lấy ACTIVE)
 * @param {number} options.skip - Số bản ghi bỏ qua (pagination)
 * @param {number} options.limit - Số bản ghi lấy về
 * @returns {Promise<{items: Array, total: number}>} - Kết quả tìm kiếm
 */
export async function searchProductsWithFullText({
  searchTerm,
  categoryId,
  brandId,
  status,
  isPublicRoute = false,
  skip = 0,
  limit = 10
}) {
  try {
    // Sanitize search term
    const sanitizedTerm = sanitizeSearchTerm(searchTerm);
    
    if (!sanitizedTerm) {
      throw new Error('Search term is empty after sanitization');
    }
    
    // Tạo search pattern
    const searchPattern = createSearchPattern(sanitizedTerm);
    
    // Escape single quotes để tránh SQL injection
    const safeSearchPattern = searchPattern.replace(/'/g, "''");
    
    // Xây dựng điều kiện WHERE
    const whereConditions = [];
    
    // FullText search condition
    whereConditions.push(`MATCH(p.name, p.description) AGAINST('${safeSearchPattern}' IN BOOLEAN MODE)`);
    
    // Các điều kiện filter khác
    if (categoryId) {
      whereConditions.push(`p.category_id = ${Number(categoryId)}`);
    }
    
    if (brandId) {
      whereConditions.push(`p.brand_id = ${Number(brandId)}`);
    }
    
    if (status) {
      const safeStatus = status.toUpperCase().replace(/'/g, "''");
      whereConditions.push(`p.status = '${safeStatus}'`);
    }
    
    // Public route chỉ lấy ACTIVE products
    if (isPublicRoute) {
      whereConditions.push(`p.status = 'ACTIVE'`);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Query để lấy items với FullText search và relevance score
    const itemsQuery = `
      SELECT p.*, 
             MATCH(p.name, p.description) AGAINST('${safeSearchPattern}' IN BOOLEAN MODE) as relevance
      FROM products p
      ${whereClause}
      ORDER BY relevance DESC, p.created_at DESC
      LIMIT ${limit} OFFSET ${skip}
    `;
    
    // Query để đếm total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      ${whereClause}
    `;
    
    // Thực hiện queries
    const [itemsResult, countResult] = await Promise.all([
      prisma.$queryRawUnsafe(itemsQuery),
      prisma.$queryRawUnsafe(countQuery)
    ]);
    
    const items = itemsResult || [];
    const total = Number(countResult[0]?.total || 0);
    
    // Include category và brand cho mỗi item
    const itemsWithRelations = await Promise.all(items.map(async (item) => {
      const [category, brand] = await Promise.all([
        prisma.category.findUnique({ 
          where: { id: item.category_id },
          select: { id: true, name: true, slug: true }
        }),
        prisma.brand.findUnique({ 
          where: { id: item.brand_id },
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

