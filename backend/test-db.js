import prisma from './lib/prisma.js';

async function testDatabase() {
  try {
    console.log('🔍 Kiểm tra kết nối database...');
    
    // Kiểm tra kết nối
    await prisma.$connect();
    console.log('✅ Kết nối database thành công!');
    
    // Đếm số lượng records
    const userCount = await prisma.user.count();
    const productCount = await prisma.product.count();
    const categoryCount = await prisma.category.count();
    const brandCount = await prisma.brand.count();
    const adminCount = await prisma.adminUser.count();
    
    console.log('\n📊 Thống kê database:');
    console.log(`👤 Users: ${userCount}`);
    console.log(`📱 Products: ${productCount}`);
    console.log(`🏷️ Categories: ${categoryCount}`);
    console.log(`🏢 Brands: ${brandCount}`);
    console.log(`👨‍💼 Admin Users: ${adminCount}`);
    
    // Lấy danh sách sản phẩm
    const products = await prisma.product.findMany({
      include: {
        category: true,
        brand: true,
        images: true,
        specifications: true
      }
    });
    
    console.log('\n🛍️ Danh sách sản phẩm:');
    products.forEach(product => {
      console.log(`- ${product.name} (${product.brand.name}) - ${product.price.toLocaleString('vi-VN')} VNĐ`);
    });
    
    // Lấy danh sách admin
    const admins = await prisma.adminUser.findMany();
    console.log('\n👨‍💼 Admin users:');
    admins.forEach(admin => {
      console.log(`- ${admin.email} (${admin.role})`);
    });
    
  } catch (error) {
    console.error('❌ Lỗi khi kiểm tra database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
