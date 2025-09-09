import fs from 'fs';

// Đọc file schema.prisma
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Thay đổi provider từ sqlite sang mysql
schema = schema.replace('provider = "sqlite"', 'provider = "mysql"');

// Thay đổi Float thành Decimal cho MySQL
schema = schema.replace(/price\s+Float/g, 'price           Decimal       @db.Decimal(12, 2)');
schema = schema.replace(/salePrice\s+Float\?/g, 'salePrice       Decimal?      @map("sale_price") @db.Decimal(12, 2)');
schema = schema.replace(/costPrice\s+Float\?/g, 'costPrice       Decimal?      @map("cost_price") @db.Decimal(12, 2)');
schema = schema.replace(/shippingFee\s+Float/g, 'shippingFee      Decimal       @default(0) @map("shipping_fee") @db.Decimal(12, 2)');
schema = schema.replace(/discountAmount\s+Float/g, 'discountAmount    Decimal       @default(0) @map("discount_amount") @db.Decimal(12, 2)');
schema = schema.replace(/totalAmount\s+Float/g, 'totalAmount      Decimal       @map("total_amount") @db.Decimal(12, 2)');
schema = schema.replace(/unitPrice\s+Float/g, 'unitPrice    Decimal @map("unit_price") @db.Decimal(12, 2)');
schema = schema.replace(/totalPrice\s+Float/g, 'totalPrice   Decimal @map("total_price") @db.Decimal(12, 2)');
schema = schema.replace(/discountValue\s+Float/g, 'discountValue  Decimal  @map("discount_value") @db.Decimal(10, 2)');
schema = schema.replace(/minimumAmount\s+Float/g, 'minimumAmount  Decimal  @default(0) @map("minimum_amount") @db.Decimal(12, 2)');
schema = schema.replace(/amount\s+Float/g, 'amount        Decimal       @db.Decimal(12, 2)');

// Ghi file mới
fs.writeFileSync('prisma/schema.prisma', schema);

console.log('✅ Đã chuyển đổi schema sang MySQL!');
