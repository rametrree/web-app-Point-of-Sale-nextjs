// app/api/products/[id]/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyTokenAndRole } from '@/lib/authMiddleware';

// GET: ดึงข้อมูลสินค้าตาม ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const authResult = await verifyTokenAndRole(request, ['admin', 'staff']);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Get product by ID error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// PUT: แก้ไขข้อมูลสินค้า
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const authResult = await verifyTokenAndRole(request, ['admin']); // เฉพาะ Admin
  if (authResult instanceof NextResponse) return authResult;

  const { id } = params;
  try {
    const { name, description, price, stock, sku, isRefundable } = await request.json();

    // ไม่ต้องมีเงื่อนไข required มากนัก เพราะอาจจะแก้ไขแค่บางฟิลด์
    if (typeof price !== 'undefined' && (typeof price !== 'number' || price <= 0)) {
        return NextResponse.json({ message: 'Price must be a positive number' }, { status: 400 });
    }
    if (typeof stock !== 'undefined' && (typeof stock !== 'number' || stock < 0)) {
        return NextResponse.json({ message: 'Stock must be a non-negative number' }, { status: 400 });
    }

    // ตรวจสอบ SKU ซ้ำ ถ้ามีการส่ง SKU มาและ SKU นั้นไม่ใช่ของ Product ตัวเอง
    if (sku) {
      const existingProduct = await prisma.product.findUnique({
        where: { sku },
      });
      if (existingProduct && existingProduct.id !== id) {
        return NextResponse.json({ message: 'SKU already exists for another product' }, { status: 409 });
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        price,
        stock,
        sku,
        isRefundable,
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: ลบสินค้า
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const authResult = await verifyTokenAndRole(request, ['admin']); // เฉพาะ Admin
  if (authResult instanceof NextResponse) return authResult;

  const { id } = params;
  try {
    await prisma.product.delete({
      where: { id },
    });
    return NextResponse.json({ message: 'Product deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Delete product error:', error);
    // กรณีที่สินค้าถูกอ้างอิงโดย SaleItem จะเกิด Foreign Key Constraint Error
    if (error.code === 'P2003') { // Prisma error code for foreign key constraint failed
      return NextResponse.json({ message: 'Cannot delete product that is part of existing sales.' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}