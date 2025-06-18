// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // ตรวจสอบว่ามีผู้ใช้ admin อยู่แล้วหรือไม่
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('12345', 10); // รหัสผ่านคือ 'adminpassword'

    await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
      },
    });
    console.log('Admin user created successfully!');
  } else {
    console.log('Admin user already exists, skipping creation.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });