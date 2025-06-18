// app/api/users/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { verifyTokenAndRole } from '@/lib/authMiddleware'; // จะสร้างในภายหลัง

export async function POST(request: Request) {
  // ตัวอย่างการใช้ middleware สำหรับ Authorization (ยังไม่ได้สร้าง verifyTokenAndRole)
const authResult = await verifyTokenAndRole(request, ['admin']);
if (authResult instanceof NextResponse) return authResult; // ถ้าไม่ผ่านการตรวจสอบสิทธิ์

  try {
    const { username, password, role } = await request.json();

    if (!username || !password || !role) {
      return NextResponse.json({ message: 'Username, password, and role are required' }, { status: 400 });
    }

    // ตรวจสอบว่า username ซ้ำหรือไม่
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json({ message: 'Username already exists' }, { status: 409 });
    }

    // เข้ารหัสรหัสผ่านก่อนบันทึกลงฐานข้อมูล
    const hashedPassword = await bcrypt.hash(password, 10); // 10 คือ salt rounds

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role,
      },
    });

    // ไม่ส่งรหัสผ่านกลับไป
    return NextResponse.json({
      id: user.id,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
    }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// API สำหรับดึงข้อมูลผู้ใช้ทั้งหมด (สำหรับ Admin)
export async function GET(request: Request) {
const authResult = await verifyTokenAndRole(request, ['admin']);
if (authResult instanceof NextResponse) return authResult;

  try {
    const users = await prisma.user.findMany({
      select: { // เลือกเฉพาะ field ที่ต้องการ ไม่เอา password
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}