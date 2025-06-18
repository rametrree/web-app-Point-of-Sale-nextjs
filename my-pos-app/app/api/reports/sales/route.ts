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

    // คำนวณกำไร-ขาดทุน (แบบง่ายๆ ยังไม่มีต้นทุนสินค้า)
    // ถ้าต้องการกำไร-ขาดทุนจริง ต้องเพิ่ม `costPrice` ใน Product Model
    const salesWithCalculations = sales.map(sale => {
      let totalCostPrice = 0; // สมมติว่าต้องการรวมต้นทุนด้วย
      // ถ้าไม่มี costPrice ใน Product Model, กำไรจะเท่ากับ finalAmount (รายได้)
      // หรืออาจจะนำไปรวมกับข้อมูลต้นทุนในภายหลัง

      sale.items.forEach(item => {
        // ถ้ามี costPrice ใน Product model:
        // totalCostPrice += item.quantity * item.product.costPrice;
      });

      return {
        ...sale,
        // profit: sale.finalAmount - totalCostPrice, // กำไร (ถ้ามีต้นทุน)
      };
    });


    // คำนวณยอดรวมทั้งหมดสำหรับช่วงเวลาที่เลือก
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.finalAmount, 0);
    const totalDiscountGiven = sales.reduce((sum, sale) => sum + sale.discount, 0);
    // const totalProfit = salesWithCalculations.reduce((sum, sale) => sum + (sale.profit || 0), 0);

    return NextResponse.json({
      sales: salesWithCalculations,
      summary: {
        totalSalesCount: sales.length,
        totalRevenue: totalRevenue,
        totalDiscountGiven: totalDiscountGiven,
        // totalProfit: totalProfit,
      },
    });
  } catch (error) {
    console.error('Get sales report error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}