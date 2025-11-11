import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // 1. Create Admin User
  console.log('👤 Creating admin user...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ecommerce.com' },
    update: {},
    create: {
      email: 'admin@ecommerce.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'System',
      role: 'ADMIN',
      isActive: true,
      isVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
  console.log('✅ Admin created:', admin.email);

  // 2. Create Categories với slug
  console.log('📁 Creating categories...');
  const categories = [
    // GHẾ VĂN PHÒNG
    { name: 'Ghế Gaming', slug: 'ghe-gaming' },
    { name: 'Ghế Công Thái Học', slug: 'ghe-cong-thai-hoc' },
    { name: 'Ghế Xoay', slug: 'ghe-xoay' },
    { name: 'Ghế Phòng Họp', slug: 'ghe-phong-hop' },
    
    // BÀN VĂN PHÒNG
    { name: 'Bàn Nâng Hạ', slug: 'ban-nang-ha' },
    { name: 'Bàn Chữ L', slug: 'ban-chu-l' },
    { name: 'Bàn Chữ U', slug: 'ban-chu-u' },
    { name: 'Bàn Họp', slug: 'ban-hop' },
    
    // NỘI THẤT KHÁC
    { name: 'Kệ Bàn', slug: 'ke-ban' },
    { name: 'Arm Màn Hình', slug: 'arm-man-hinh' },
    { name: 'Tay Vịn Ghế', slug: 'tay-vin-ghe' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log('✅ Categories created:', categories.length);

  // 3. Create Brands
  console.log('🏢 Creating brands...');
  const brands = [
    { name: 'DXRacer', country: 'USA' },
    { name: 'Secretlab', country: 'Singapore' },
    { name: 'Herman Miller', country: 'USA' },
    { name: 'Steelcase', country: 'USA' },
    { name: 'FlexiSpot', country: 'USA' },
    { name: 'IKEA', country: 'Sweden' },
    { name: 'Autonomous', country: 'USA' },
    { name: 'ErgoTune', country: 'Singapore' },
  ];

  for (const brand of brands) {
    const existing = await prisma.brand.findFirst({ where: { name: brand.name } });
    if (!existing) {
      await prisma.brand.create({ data: brand });
    }
  }
  console.log('✅ Brands created:', brands.length);

  // 4. Create Sample Products với Variants
  console.log('🛍️ Creating sample products...');
  
  const gamingChairCategory = await prisma.category.findUnique({ where: { slug: 'ghe-gaming' } });
  const standingDeskCategory = await prisma.category.findUnique({ where: { slug: 'ban-nang-ha' } });
  const dxracerBrand = await prisma.brand.findFirst({ where: { name: 'DXRacer' } });
  const flexispotBrand = await prisma.brand.findFirst({ where: { name: 'FlexiSpot' } });

  // Product 1: Ghế Gaming
  await prisma.product.create({
    data: {
      name: 'Ghế Gaming DXRacer Formula',
      slug: 'ghe-gaming-dxracer-formula',
      description: 'Ghế gaming cao cấp với thiết kế ergonomic, hỗ trợ tối đa cho game thủ chuyên nghiệp.',
      categoryId: gamingChairCategory.id,
      brandId: dxracerBrand.id,
      price: 7290000,
      salePrice: null,
      costPrice: 5000000,
      status: 'ACTIVE',
      isFeatured: true,
      
      variants: {
        create: [
          {
            name: 'Đen - Điều chỉnh',
            stockQuantity: 50,
            minStockLevel: 5,
            width: 640,
            depth: 710,
            height: 1040,
            heightMax: 1115,
            warranty: '24 tháng',
            material: 'Da PU cao cấp',
            weightCapacity: 150,
            color: 'Đen',
            dimensionNote: 'Tựa lưng nghiêng 90-135°, Tay vịn 4D',
            isActive: true,
          },
          {
            name: 'Đỏ - Điều chỉnh',
            stockQuantity: 30,
            minStockLevel: 5,
            width: 640,
            depth: 710,
            height: 1040,
            heightMax: 1115,
            warranty: '24 tháng',
            material: 'Da PU cao cấp',
            weightCapacity: 150,
            color: 'Đỏ',
            dimensionNote: 'Tựa lưng nghiêng 90-135°, Tay vịn 4D',
            isActive: true,
          },
        ],
      },
    },
  });

  // Product 2: Bàn Nâng Hạ
  await prisma.product.create({
    data: {
      name: 'Bàn Nâng Hạ Điện FlexiSpot E7',
      slug: 'ban-nang-ha-dien-flexispot-e7',
      description: 'Bàn nâng hạ điện tự động với khung thép chắc chắn, động cơ kép êm ái.',
      categoryId: standingDeskCategory.id,
      brandId: flexispotBrand.id,
      price: 12000000,
      salePrice: 10500000,
      costPrice: 8000000,
      status: 'ACTIVE',
      isFeatured: true,
      
      variants: {
        create: [
          {
            name: '1200x600mm - Nâu óc chó',
            stockQuantity: 30,
            minStockLevel: 5,
            width: 1200,
            depth: 600,
            height: 720,
            heightMax: 1200,
            warranty: '5 năm',
            material: 'Gỗ MDF phủ Melamine',
            weightCapacity: 125,
            color: 'Nâu óc chó',
            dimensionNote: 'Động cơ kép, 4 bộ nhớ',
            isActive: true,
          },
          {
            name: '1400x700mm - Nâu óc chó',
            stockQuantity: 25,
            minStockLevel: 5,
            width: 1400,
            depth: 700,
            height: 720,
            heightMax: 1200,
            warranty: '5 năm',
            material: 'Gỗ MDF phủ Melamine',
            weightCapacity: 125,
            color: 'Nâu óc chó',
            dimensionNote: 'Động cơ kép, 4 bộ nhớ',
            isActive: true,
          },
          {
            name: '1600x800mm - Nâu óc chó',
            stockQuantity: 20,
            minStockLevel: 5,
            width: 1600,
            depth: 800,
            height: 720,
            heightMax: 1200,
            warranty: '5 năm',
            material: 'Gỗ MDF phủ Melamine',
            weightCapacity: 125,
            color: 'Nâu óc chó',
            dimensionNote: 'Động cơ kép, 4 bộ nhớ',
            isActive: true,
          },
        ],
      },
    },
  });

  console.log('✅ Sample products created');

  console.log('');
  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log('- Admin: admin@ecommerce.com / admin123');
  console.log('- Categories:', categories.length);
  console.log('- Brands:', brands.length);
  console.log('- Products: 2 (with variants)');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
