/**
 * Script để thêm FullText index cho bảng products
 * Chạy script này sau khi đã có dữ liệu trong bảng products
 * 
 * Usage: node backend/scripts/add-fulltext-index.js
 */

import prisma from '../config/prisma.js';

async function addFullTextIndex() {
  try {
    console.log('🔄 Đang thêm FullText index cho bảng products...');
    
    // Kiểm tra xem index đã tồn tại chưa
    const checkIndex = await prisma.$queryRawUnsafe(`
      SHOW INDEX FROM products WHERE Key_name = 'ft_product_search'
    `);
    
    if (checkIndex.length > 0) {
      console.log('✅ FullText index đã tồn tại!');
      return;
    }
    
    // Thêm FullText index
    await prisma.$executeRawUnsafe(`
      ALTER TABLE products 
      ADD FULLTEXT INDEX ft_product_search (name, description)
    `);
    
    console.log('✅ Đã thêm FullText index thành công!');
    console.log('📝 Index: ft_product_search trên các cột (name, description)');
    
  } catch (error) {
    console.error('❌ Lỗi khi thêm FullText index:', error.message);
    
    // Nếu lỗi do index đã tồn tại
    if (error.message.includes('Duplicate key name')) {
      console.log('ℹ️  FullText index đã tồn tại!');
    } else {
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Chạy script
addFullTextIndex()
  .then(() => {
    console.log('✨ Hoàn thành!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Lỗi:', error);
    process.exit(1);
  });

