// app/api/customers/[id]/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyTokenAndRole } from '@/lib/authMiddleware';

// GET: ดึงข้อมูลลูกค้าตาม ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
    const authResult = await verifyTokenAndRole(request, ['admin', 'staff']);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = params;
    try {
        const customer = await prisma.customer.findUnique({ where: { id } });
        if (!customer) return NextResponse.json({ message: 'Customer not found' }, { status: 404 });
        return NextResponse.json(customer);
    } catch (error) {
        console.error('Get customer by ID error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

// PUT: แก้ไขข้อมูลลูกค้า
export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const authResult = await verifyTokenAndRole(request, ['admin', 'staff']);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = params;
    try {
        const { name, email, phone, isMember } = await request.json();

        if (!name) return NextResponse.json({ message: 'Customer name is required' }, { status: 400 });

        // ตรวจสอบ email/phone ซ้ำ (ถ้ามีการส่งมาและไม่ใช่ของตัวเอง)
        if (email) {
            const existingEmail = await prisma.customer.findUnique({ where: { email } });
            if (existingEmail && existingEmail.id !== id) return NextResponse.json({ message: 'Email already exists for another customer' }, { status: 409 });
        }
        if (phone) {
            const existingPhone = await prisma.customer.findUnique({ where: { phone } });
            if (existingPhone && existingPhone.id !== id) return NextResponse.json({ message: 'Phone number already exists for another customer' }, { status: 409 });
        }

        const updatedCustomer = await prisma.customer.update({
            where: { id },
            data: { name, email, phone, isMember },
        });
        return NextResponse.json(updatedCustomer);
    } catch (error) {
        console.error('Update customer error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

// DELETE: ลบลูกค้า
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const authResult = await verifyTokenAndRole(request, ['admin']); // เฉพาะ Admin
    if (authResult instanceof NextResponse) return authResult;

    const { id } = params;
    try {
        await prisma.customer.delete({ where: { id } });
        return NextResponse.json({ message: 'Customer deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error('Delete customer error:', error);
        if (error.code === 'P2003') { // Prisma error code for foreign key constraint failed
          return NextResponse.json({ message: 'Cannot delete customer that is linked to existing sales.' }, { status: 409 });
        }
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}