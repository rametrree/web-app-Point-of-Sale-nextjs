// app/api/reports/sales/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyTokenAndRole } from '@/lib/authMiddleware';

export async function GET(request: Request) {
  // เฉพาะ Admin เท่านั้นที่ดูรายงานยอดขายได้
  const authResult = await verifyTokenAndRole(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (startDateParam) {
    startDate = new Date(startDateParam);
    // ตั้งเวลาเป็น 00:00:00 ของวันนั้น
    startDate.setHours(0, 0, 0, 0);
  }
  if (endDateParam) {
    endDate = new Date(endDateParam);
    // ตั้งเวลาเป็น 23:59:59 ของวันนั้น
    endDate.setHours(23, 59, 59, 999);
  }

  try {
    const sales = await prisma.sale.findMany({
      where: {
        saleDate: {
          gte: startDate, // Greater than or equal to
          lte: endDate,   // Less than or equal to
        },
      },
      include: {
        user: {
          select: { username: true }, // ดึงชื่อพนักงานที่ขาย
        },
        customer: {
          select: { name: true, isMember: true }, // ดึงชื่อลูกค้าและสถานะสมาชิก
        },
        items: {
          include: {
            product: {
              select: { name: true, price: true }, // ดึงชื่อและราคาเดิมของสินค้า
            },
          },
        },
      },
      orderBy: {
        saleDate: 'desc', // เรียงตามวันที่ขายล่าสุด
      },
    });

    // หมายเหตุ: การคำนวณกำไร-ขาดทุน สามารถทำได้ในภายหลัง
    // โดยการเพิ่ม `costPrice` ใน Product Model และคำนวณจาก `sale.items`
    //
    // ตัวอย่าง:
    // const salesWithProfit = sales.map(sale => {
    //   const totalCostPrice = sale.items.reduce((acc, item) => acc + (item.quantity * (item.product.costPrice || 0)), 0);
    //   return { ...sale, profit: sale.finalAmount - totalCostPrice };
    // });
    // const totalProfit = salesWithProfit.reduce((sum, sale) => sum + sale.profit, 0);


    // คำนวณยอดรวมทั้งหมดสำหรับช่วงเวลาที่เลือก
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.finalAmount, 0);
    const totalDiscountGiven = sales.reduce((sum, sale) => sum + sale.discount, 0);

    return NextResponse.json({
      sales: sales, // ส่งข้อมูลการขายเดิมไปก่อน
      summary: {
        totalSalesCount: sales.length,
        totalRevenue: totalRevenue,
        totalDiscountGiven: totalDiscountGiven,
        // totalProfit: totalProfit, // สามารถเปิดใช้งานได้เมื่อคำนวณกำไรแล้ว
      },
    });
  } catch (error) {
    console.error('Get sales report error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}