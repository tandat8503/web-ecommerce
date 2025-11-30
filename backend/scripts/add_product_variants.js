import 'dotenv/config';
import prisma from '../config/prisma.js';

/**
 * Script để thêm biến thể cho sản phẩm
 * 
 * Script sẽ thêm biến thể với: 3 màu (Đen, Trắng, Xám) x 2 kích thước = 6 biến thể
 * Mỗi màu có 2 kích thước khác nhau: 600x600x750mm, 700x700x800mm
 * 
 * Cách sử dụng:
 * - Thêm biến thể cho TẤT CẢ sản phẩm có 1 biến thể:
 *   node backend/scripts/add_product_variants.js
 * 
 * - Thêm biến thể cho 1 sản phẩm cụ thể:
 *   node backend/scripts/add_product_variants.js <productId>
 * 
 * Ví dụ:
 *   node backend/scripts/add_product_variants.js 3
 */

// Các màu sắc phổ biến
const COLORS = [
  'Đen', 'Trắng', 'Xám', 'Nâu', 'Be', 'Xanh dương', 
  'Xanh lá', 'Đỏ', 'Vàng', 'Hồng', 'Cam', 'Tím'
];

// Các kích thước mẫu (width x depth x height mm)
const DIMENSIONS = [
  { width: 600, depth: 600, height: 750 },
  { width: 700, depth: 700, height: 800 },
  { width: 800, depth: 800, height: 850 },
  { width: 900, depth: 900, height: 900 },
  { width: 1000, depth: 1000, height: 950 },
  { width: 1200, depth: 600, height: 750 },
  { width: 1400, depth: 700, height: 800 },
  { width: 1600, depth: 800, height: 850 },
];

// Các vật liệu phổ biến
const MATERIALS = [
  'Gỗ sồi', 'Gỗ thông', 'Gỗ cao su', 'Gỗ MDF', 
  'Gỗ MFC', 'Kim loại', 'Nhựa', 'Da', 'Vải'
];

// Bảo hành
const WARRANTIES = ['12 tháng', '24 tháng', '36 tháng', '60 tháng'];

/**
 * Tạo biến thể ngẫu nhiên
 */
function generateRandomVariant(productId, index) {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const dimension = DIMENSIONS[Math.floor(Math.random() * DIMENSIONS.length)];
  const material = MATERIALS[Math.floor(Math.random() * MATERIALS.length)];
  const warranty = WARRANTIES[Math.floor(Math.random() * WARRANTIES.length)];
  
  // Stock quantity ngẫu nhiên từ 10 đến 100
  const stockQuantity = Math.floor(Math.random() * 91) + 10;
  
  return {
    productId,
    color,
    width: dimension.width,
    depth: dimension.depth,
    height: dimension.height,
    material,
    warranty,
    stockQuantity,
    minStockLevel: 5,
    isActive: true,
  };
}

/**
 * Tạo biến thể với các thuộc tính cụ thể
 * Bao gồm tất cả các trường trong bảng ProductVariant
 */
function createSpecificVariant(productId, options = {}) {
  const {
    // Kích thước
    width = 600,
    depth = 600,
    height = 750,
    heightMax = null, // Chiều cao tối đa (nếu có)
    
    // Màu sắc và vật liệu
    color = COLORS[0],
    material = MATERIALS[0],
    
    // Bảo hành
    warranty = WARRANTIES[0],
    
    // Kho hàng
    stockQuantity = 50,
    minStockLevel = 5,
    
    // Trạng thái
    isActive = true,
    
    // Trọng lượng tối đa
    weightCapacity = null, // Decimal (kg)
    
    // Ghi chú kích thước
    dimensionNote = null,
  } = options;

  return {
    productId,
    // Kích thước
    width,
    depth,
    height,
    heightMax,
    
    // Màu sắc và vật liệu
    color,
    material,
    
    // Bảo hành
    warranty,
    
    // Kho hàng
    stockQuantity,
    minStockLevel,
    
    // Trạng thái
    isActive,
    
    // Trọng lượng tối đa
    weightCapacity,
    
    // Ghi chú kích thước
    dimensionNote,
  };
}

/**
 * Thêm biến thể cho một sản phẩm
 * Mỗi màu có 2 kích thước khác nhau (tổng cộng 6 biến thể: 3 màu x 2 kích thước)
 */
async function addVariantsToProduct(productId) {
  // Kiểm tra sản phẩm có tồn tại không
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      _count: {
        select: {
          variants: true,
        },
      },
    },
  });

  if (!product) {
    console.error(`❌ Không tìm thấy sản phẩm với ID: ${productId}`);
    return { success: false, message: 'Product not found' };
  }

  // Chỉ thêm biến thể cho sản phẩm có ít hơn 10 biến thể
  if (product._count.variants >= 10) {
    console.log(`⏭️  Bỏ qua sản phẩm ID ${productId} (${product.name}) - đã có ${product._count.variants} biến thể (>= 10)`);
    return { success: false, message: 'Product already has enough variants' };
  }

  console.log(`\n📦 Xử lý sản phẩm: ${product.name} (ID: ${product.id})`);

  // Kiểm tra các biến thể hiện có để tránh trùng lặp
  const existingVariants = await prisma.productVariant.findMany({
    where: { productId },
    select: {
      color: true,
      width: true,
      depth: true,
      height: true,
    },
  });

  // Tạo biến thể: mỗi màu có 3 kích thước khác nhau
  const variantsToCreate = [];

  // Danh sách màu sắc
  const colors = ['Đen', 'Trắng', 'Xám'];
  
  // Danh sách kích thước (2 kích thước cho mỗi màu)
  const sizes = [
    { width: 600, depth: 600, height: 750 },
    { width: 700, depth: 700, height: 800 },
  ];

  // Vật liệu và bảo hành cho mỗi màu
  const materialByColor = {
    'Đen': 'Gỗ sồi',
    'Trắng': 'Gỗ MDF',
    'Xám': 'Gỗ thông',
  };

  const warrantyByColor = {
    'Đen': '12 tháng',
    'Trắng': '24 tháng',
    'Xám': '12 tháng',
  };

  // Trọng lượng tối đa cho mỗi kích thước (kg)
  const weightCapacityBySize = {
    '600x600x750': 50.00,  // 50kg
    '700x700x800': 70.00,  // 70kg
  };

  // Tạo biến thể: mỗi màu x 2 kích thước
  colors.forEach((color, colorIndex) => {
    sizes.forEach((size, sizeIndex) => {
      const sizeKey = `${size.width}x${size.depth}x${size.height}`;
      const weightCapacity = weightCapacityBySize[sizeKey] || null;
      
      // Tính heightMax (nếu có) - thường là height + 50-100mm
      const heightMax = size.height + 100;
      
      // Ghi chú kích thước
      const dimensionNote = `Kích thước: ${size.width}x${size.depth}x${size.height}mm${heightMax ? `, Chiều cao tối đa: ${heightMax}mm` : ''}`;
      
      variantsToCreate.push(
        createSpecificVariant(productId, {
          // Kích thước
          width: size.width,
          depth: size.depth,
          height: size.height,
          heightMax: heightMax,
          
          // Màu sắc và vật liệu
          color: color,
          material: materialByColor[color],
          
          // Bảo hành
          warranty: warrantyByColor[color],
          
          // Kho hàng
          stockQuantity: 30 + (colorIndex * 10) + (sizeIndex * 5), // Stock khác nhau cho mỗi biến thể
          minStockLevel: 5,
          
          // Trạng thái
          isActive: true,
          
          // Trọng lượng tối đa
          weightCapacity: weightCapacity,
          
          // Ghi chú kích thước
          dimensionNote: dimensionNote,
        })
      );
    });
  });

  // Lọc bỏ các biến thể trùng lặp (cùng màu và kích thước)
  const uniqueVariants = variantsToCreate.filter((newVariant) => {
    return !existingVariants.some(
      (existing) =>
        existing.color === newVariant.color &&
        existing.width === newVariant.width &&
        existing.depth === newVariant.depth &&
        existing.height === newVariant.height
    );
  });

  if (uniqueVariants.length === 0) {
    console.log(`   ⚠️  Tất cả các biến thể đã tồn tại. Không có biến thể mới nào được thêm.`);
    return { success: false, message: 'All variants already exist' };
  }

  // Thêm từng biến thể vào database
  const createdVariants = [];
  for (const variantData of uniqueVariants) {
    try {
      const variant = await prisma.productVariant.create({
        data: variantData,
      });
      createdVariants.push(variant);
      const sizeInfo = `${variant.width}x${variant.depth}x${variant.height}mm`;
      const weightInfo = variant.weightCapacity ? ` - Tải trọng: ${variant.weightCapacity}kg` : '';
      const heightMaxInfo = variant.heightMax ? ` - H.max: ${variant.heightMax}mm` : '';
      console.log(
        `   ✅ Đã thêm: ${variant.color} - ${sizeInfo}${heightMaxInfo}${weightInfo} - Stock: ${variant.stockQuantity}`
      );
    } catch (error) {
      console.error(`   ❌ Lỗi khi thêm biến thể:`, error.message);
    }
  }

  return { 
    success: true, 
    createdCount: createdVariants.length,
    totalVariants: product._count.variants + createdVariants.length
  };
}

async function main() {
  try {
    const productId = process.argv[2] ? parseInt(process.argv[2]) : null;

    // Nếu có productId, chỉ thêm cho sản phẩm đó
    if (productId) {
      const result = await addVariantsToProduct(productId);
      if (result.success) {
        console.log(`\n🎉 Hoàn thành! Đã thêm ${result.createdCount} biến thể mới.`);
        console.log(`   Tổng số biến thể: ${result.totalVariants}`);
      }
      return;
    }

    // Nếu không có productId, tìm tất cả sản phẩm và thêm biến thể cho sản phẩm có ít biến thể
    console.log('🔍 Đang kiểm tra tất cả sản phẩm...\n');
    
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        status: true,
        _count: {
          select: {
            variants: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });

    if (products.length === 0) {
      console.log('❌ Không tìm thấy sản phẩm nào trong database.');
      process.exit(1);
    }

    // Hiển thị thống kê
    console.log('📊 THỐNG KÊ SẢN PHẨM:');
    console.log('─'.repeat(80));
    products.forEach((p) => {
      console.log(
        `ID: ${p.id.toString().padEnd(5)} | ` +
        `Tên: ${p.name.padEnd(40)} | ` +
        `Biến thể: ${p._count.variants}`
      );
    });
    console.log('─'.repeat(80));
    console.log(`\nTổng số sản phẩm: ${products.length}`);
    console.log(`Tổng số biến thể: ${products.reduce((sum, p) => sum + p._count.variants, 0)}\n`);

    // Lọc các sản phẩm có ít hơn 10 biến thể (để thêm biến thể)
    const productsToUpdate = products.filter(p => p._count.variants < 10);

    if (productsToUpdate.length === 0) {
      console.log('✅ Tất cả sản phẩm đã có đủ biến thể (>= 10 biến thể).');
      process.exit(0);
    }

    console.log(`📋 Tìm thấy ${productsToUpdate.length} sản phẩm có ít hơn 10 biến thể:`);
    console.log('─'.repeat(80));
    productsToUpdate.forEach((p) => {
      console.log(
        `ID: ${p.id.toString().padEnd(5)} | ` +
        `Tên: ${p.name.padEnd(40)} | ` +
        `Biến thể hiện tại: ${p._count.variants}`
      );
    });
    console.log('─'.repeat(80));
    console.log(`\n🚀 Bắt đầu thêm biến thể cho mỗi sản phẩm (3 màu x 2 kích thước = 6 biến thể)...\n`);

    let totalSuccess = 0;
    let totalCreated = 0;
    let totalSkipped = 0;

    // Xử lý từng sản phẩm
    for (const product of productsToUpdate) {
      const result = await addVariantsToProduct(product.id);
      if (result.success) {
        totalSuccess++;
        totalCreated += result.createdCount;
      } else {
        totalSkipped++;
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('📊 TỔNG KẾT:');
    console.log(`   ✅ Thành công: ${totalSuccess} sản phẩm`);
    console.log(`   ⏭️  Bỏ qua: ${totalSkipped} sản phẩm`);
    console.log(`   📦 Tổng số biến thể đã thêm: ${totalCreated}`);
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    if (error.meta) {
      console.error('   Chi tiết:', JSON.stringify(error.meta, null, 2));
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

