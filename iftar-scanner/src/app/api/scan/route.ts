import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json({ status: "invalid", message: "No IIT ID in QR code." });
        }

        const student = await prisma.student.findFirst({
            where: { iitId: token.trim() },
            select: { id: true, iitId: true, firstName: true, lastName: true, attended: true }
        });

        if (!student) {
            return NextResponse.json({ status: "invalid", message: "IIT ID not found in registrations." });
        }

        const fullName = `${student.firstName} ${student.lastName}`.trim();

        if (student.attended) {
            return NextResponse.json({ status: "already_used", name: fullName, iit_id: student.iitId });
        }

        const updated = await prisma.student.update({
            where: { id: student.id },
            data: {
                attended: true,
                attendedAt: new Date(),
            },
            select: { iitId: true }
        });

        return NextResponse.json({ status: "success", name: fullName, iit_id: updated.iitId });

    } catch (error: any) {
        console.error('Scan Error:', error);
        return NextResponse.json({ status: "error", message: error.message || "Internal server error" }, { status: 500 });
    }
}
