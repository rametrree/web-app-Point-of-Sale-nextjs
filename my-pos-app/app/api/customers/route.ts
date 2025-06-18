// app/api/customers/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyTokenAndRole } from '@/lib/authMiddleware';

// GET: ดึงข้อมูลลูกค้าทั้งหมด
export async function GET(request: Request) {
  const authResult = await verifyTokenAndRole(request, ['admin', 'staff']); // พนักงานทั่วไปก็ควรดูข้อมูลลูกค้าได้
  if (authResult instanceof NextResponse) return authResult;

  try {
    const customers = await prisma.customer.findMany();
    return NextResponse.json(customers);
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST: เพิ่มลูกค้าใหม่
export async function POST(request: Request) {
  const authResult = await verifyTokenAndRole(request, ['admin', 'staff']); // พนักงานทั่วไปก็เพิ่มลูกค้าได้
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { name, email, phone, isMember } = await request.json();

    if (!name) {
      return NextResponse.json({ message: 'Customer name is required' }, { status: 400 });
    }

    // ตรวจสอบ email/phone ซ้ำ ถ้ามีการระบุ
    if (email) {
      const existingEmail = await prisma.customer.findUnique({ where: { email } });
      if (existingEmail) return NextResponse.json({ message: 'Email already exists' }, { status: 409 });
    }
    if (phone) {
        const existingPhone = await prisma.customer.findUnique({ where: { phone } });
        if (existingPhone) return NextResponse.json({ message: 'Phone number already exists' }, { status: 409 });
    }


    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        isMember: isMember || false,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// PUT/DELETE สำหรับลูกค้าแต่ละรายการ (ต้องการ customerId)
// จะต้องสร้างไฟล์ app/api/customers/[id]/route.ts เพิ่ม