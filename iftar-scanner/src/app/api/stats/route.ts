import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // Efficiently get counts using groupBy
        const groups = await prisma.student.groupBy({
            by: ['attended'],
            _count: { _all: true }
        });

        const total = groups.reduce((acc, curr) => acc + curr._count._all, 0);
        const present = groups.find(g => g.attended)?._count._all || 0;

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
