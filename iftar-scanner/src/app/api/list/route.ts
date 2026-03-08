import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const students = await prisma.student.findMany({
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                iitId: true,
                attended: true,
                attendedAt: true,
            },
            orderBy: [
                { attendedAt: 'desc' }
            ]
        });

        const formatted = students.map((s: any) => ({
            name: `${s.firstName} ${s.lastName}`.trim(),
            email: s.email,
            iit_id: s.iitId,
            attended: s.attended,
        }));

        // Case-insensitive alphabetical sort
        formatted.sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { sensitivity: 'accent' }));

        return NextResponse.json({
            status: "success",
            data: formatted
        });
    } catch (error: any) {
        console.error('List Error:', error);
        return NextResponse.json({ status: "error", message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
