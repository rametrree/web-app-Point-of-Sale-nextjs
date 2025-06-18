// app/api/products/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyTokenAndRole } from '@/lib/authMiddleware';

// GET: ดึงข้อมูลสินค้าทั้งหมด
export async function GET(request: Request) {
  // ให้พนักงานทุกคนดูสินค้าได้ (หรือกำหนด role ที่เหมาะสม)
  const authResult = await verifyTokenAndRole(request, ['admin', 'staff']);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const products = await prisma.product.findMany();
    return NextResponse.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST: เพิ่มสินค้าใหม่
export async function POST(request: Request) {
  // เฉพาะ Admin เท่านั้นที่เพิ่มสินค้าได้
  const authResult = await verifyTokenAndRole(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { name, description, price, stock, sku, isRefundable } = await request.json();

    if (!name || typeof price !== 'number' || typeof stock !== 'number') {
      return NextResponse.json({ message: 'Name, price, and stock are required and must be valid numbers' }, { status: 400 });
    }
    if (price <= 0 || stock < 0) {
        return NextResponse.json({ message: 'Price must be positive and stock cannot be negative' }, { status: 400 });
    }

    // ตรวจสอบ SKU ซ้ำ (ถ้ามี)
    if (sku) {
      const existingProduct = await prisma.product.findUnique({
        where: { sku },
      });
      if (existingProduct) {
        return NextResponse.json({ message: 'SKU already exists' }, { status: 409 });
      }
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        stock,
        sku,
        isRefundable: isRefundable || false, // ค่าเริ่มต้นเป็น false ถ้าไม่ได้ระบุ
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// PUT/DELETE สำหรับสินค้าแต่ละรายการ (ต้องการ productId)
// จะต้องสร้างไฟล์ app/api/products/[id]/route.ts เพิ่ม