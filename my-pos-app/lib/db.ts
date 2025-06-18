// lib/db.ts
import { PrismaClient } from '@prisma/client';

// ประกาศตัวแปร prisma แบบ global เพื่อป้องกันการสร้าง instance ใหม่ทุกครั้งที่ Hot-Reload ใน Next.js
declare global {
  var prisma: PrismaClient | undefined;
}

// ถ้าไม่มี global.prisma ให้สร้าง instance ใหม่
// ถ้ามีอยู่แล้ว ให้ใช้ instance เดิม
const prisma = global.prisma || new PrismaClient({
  log: ['query', 'info', 'warn', 'error'], // สำหรับ debug: แสดง query ที่รัน
});

// ใน Production, กำหนดให้ global.prisma เป็น instance ที่สร้างขึ้น
if (process.env.NODE_ENV === 'development') global.prisma = prisma;

export default prisma;