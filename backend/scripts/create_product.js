import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const product = await prisma.product.create({
      data: {
        name: 'Ghe ergonomic A1',
        slug: 'ghe-ergonomic-a1',
        sku: 'GE-A1',
        price: '199.99',
        stockQuantity: 10,
        description: 'Test product',
        categoryId: 1,
        brandId: 1,
      }
    });
    console.log(JSON.stringify({ ok: true, product }));
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: err.message, meta: err.meta }));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
