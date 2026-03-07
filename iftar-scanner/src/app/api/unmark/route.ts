import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json({ status: "invalid", message: "No IIT ID provided." });
        }

        const student = await prisma.student.findFirst({
            where: { iitId: token.trim() },
            select: { id: true, iitId: true, firstName: true, lastName: true, attended: true }
        });

        if (!student) {
            return NextResponse.json({ status: "invalid", message: "IIT ID not found." });
        }

        if (!student.attended) {
            return NextResponse.json({ status: "already_pending", message: "Student is not admitted." });
        }

        const fullName = `${student.firstName} ${student.lastName}`.trim();

        // Mark as not attended
        const updated = await prisma.student.update({
            where: { id: student.id },
            data: {
                attended: false,
                attendedAt: null,
            },
            select: { iitId: true }
        });

        return NextResponse.json({ status: "success", name: fullName, iit_id: updated.iitId });

    } catch (error: any) {
        console.error('Unmark Error:', error);
        return NextResponse.json({ status: "error", message: error.message || "Internal server error" }, { status: 500 });
    }
}
