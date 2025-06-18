// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/db'; // นำเข้า Prisma Client ที่เราสร้างไว้
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ดึง JWT_SECRET จาก Environment Variables
const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request: Request) {
  if (!JWT_SECRET) {
    console.error('JWT_SECRET is not defined in environment variables.');
    return NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
  }

  try {
    const { username, password } = await request.json();

    // 1. ตรวจสอบว่ามีข้อมูลครบถ้วน
    if (!username || !password) {
      return NextResponse.json({ message: 'Username and password are required' }, { status: 400 });
    }

    // 2. ค้นหาผู้ใช้จากฐานข้อมูล
    const user = await prisma.user.findUnique({
      where: { username },
    });

    // 3. ตรวจสอบว่าผู้ใช้มีอยู่จริงและรหัสผ่านถูกต้อง
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // 4. สร้าง JWT Token
    // Payload จะเก็บข้อมูลที่ต้องการ เช่น userId และ role
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' } // Token จะหมดอายุใน 1 ชั่วโมง
    );

    // 5. ส่ง Token และข้อมูลผู้ใช้กลับไป (ไม่ส่ง password กลับไป)
    return NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}