import 'dotenv/config';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    let brand = await prisma.brand.findFirst({ where: { name: 'IKEA' } });
    if (!brand) {
      brand = await prisma.brand.create({ data: { name: 'IKEA', country: 'Sweden', isActive: true } });
    }
    console.log(JSON.stringify({ ok: true, brand }));
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: err.message }));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
