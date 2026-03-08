import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const total = await prisma.student.count();
        const present = await prisma.student.count({
            where: { attended: true }
        });

        return NextResponse.json({
            status: "success",
            total,
            present
        });
    } catch (error: any) {
        console.error('Stats Error:', error);
        return NextResponse.json({ status: "error", message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
