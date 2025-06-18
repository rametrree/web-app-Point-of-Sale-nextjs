// app/api/sales/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyTokenAndRole } from '@/lib/authMiddleware';

// Type สำหรับ Item ที่ส่งมาจาก Frontend
interface CartItem {
  productId: string;
  quantity: number;
}

export async function POST(request: Request) {
  // อนุญาตเฉพาะ staff และ admin ที่จะทำการขายได้
  const authResult = await verifyTokenAndRole(request, ['admin', 'staff']);
  if (authResult instanceof NextResponse) return authResult;

  const { userId } = authResult; // ดึง userId จาก JWT Payload
  const { cartItems, customerId }: { cartItems: CartItem[]; customerId?: string } = await request.json();

  if (!cartItems || cartItems.length === 0) {
    return NextResponse.json({ message: 'Cart cannot be empty' }, { status: 400 });
  }

  try {
    let totalAmount = 0;
    let discount = 0;
    const saleItemsData: { productId: string; quantity: number; price: number }[] = [];
    const productUpdates: { id: string; stock: number }[] = [];
    let customerIsMember = false;

    // 1. ตรวจสอบข้อมูลลูกค้า (ถ้ามี)
    if (customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: { isMember: true },
      });
      if (customer) {
        customerIsMember = customer.isMember;
      }
    }

    // 2. ตรวจสอบสต็อกและคำนวณราคาสินค้าแต่ละรายการ
    for (const item of cartItems) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        return NextResponse.json({ message: `Product with ID ${item.productId} not found` }, { status: 404 });
      }
      if (product.stock < item.quantity) {
        return NextResponse.json({ message: `Not enough stock for product ${product.name}. Available: ${product.stock}` }, { status: 400 });
      }

      const itemPrice = product.price * item.quantity;
      totalAmount += itemPrice;
      saleItemsData.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price, // บันทึกราคา ณ ตอนที่ขาย
      });

      productUpdates.push({
        id: product.id,
        stock: product.stock - item.quantity,
      });

      // 3. คำนวณเงินคืน 2% สำหรับสมาชิก
      if (customerIsMember && product.isRefundable) {
        discount += itemPrice * 0.02; // 2% cashback
      }
    }

    // 4. คำนวณราคาสุทธิ
    const finalAmount = totalAmount - discount;

    // 5. บันทึกข้อมูลการขายและอัปเดตสต็อกใน Transaction เดียวกัน
    // ใช้ Prisma Transaction เพื่อให้แน่ใจว่าถ้ามีส่วนไหนผิดพลาด จะ Rollback ทั้งหมด
    const result = await prisma.$transaction(async (tx) => {
      // สร้างรายการขาย
      const sale = await tx.sale.create({
        data: {
          totalAmount: totalAmount,
          discount: discount,
          finalAmount: finalAmount,
          userId: userId,
          customerId: customerId || null, // ถ้าไม่มี customerId ให้เป็น null
          items: {
            createMany: {
              data: saleItemsData,
            },
          },
        },
      });

      // อัปเดตสต็อกสินค้า
      for (const update of productUpdates) {
        await tx.product.update({
          where: { id: update.id },
          data: { stock: update.stock },
        });
      }

      return sale;
    });

    return NextResponse.json({
      message: 'Sale completed successfully!',
      saleId: result.id,
      finalAmount: result.finalAmount,
      totalAmount: result.totalAmount,
      discount: result.discount,
    }, { status: 201 });
  } catch (error) {
    console.error('Sale transaction error:', error);
    // ตรวจสอบ error code ที่เฉพาะเจาะจงของ Prisma หากจำเป็น
    return NextResponse.json({ message: 'Failed to complete sale: ' + error.message }, { status: 500 });
  }
}