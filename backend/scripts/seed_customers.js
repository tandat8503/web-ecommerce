import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const customers = [
    {
      email: "nguyenvana@example.com",
      firstName: "Nguyen",
      lastName: "Van A",
      phone: "0901234567",
      isActive: true,
      isVerified: true,
    },
    {
      email: "tranthib@example.com",
      firstName: "Tran",
      lastName: "Thi B",
      phone: "0912345678",
      isActive: true,
      isVerified: false,
    },
    {
      email: "lequangc@example.com",
      firstName: "Le",
      lastName: "Quang C",
      phone: "0987654321",
      isActive: false,
      isVerified: true,
    },
  ]

  for (const c of customers) {
    await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: c,
    })
  }

  console.log("✅ Seeded customers thành công")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
