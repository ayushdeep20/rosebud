import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (session?.user?.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
    });

    if (!student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const url = new URL(req.url);
    let academicYearId = url.searchParams.get("academicYearId");

    if (!academicYearId) {
      const currentYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true },
      });
      academicYearId = currentYear?.id ?? null;
    }

    if (!academicYearId) {
      return NextResponse.json({ error: "No current academic year is set" }, { status: 400 });
    }

    const feeDues = await prisma.feeDue.findMany({
      where: { studentId: student.id, academicYearId },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });

    const payments = await prisma.payment.findMany({
      where: { studentId: student.id, academicYearId },
      orderBy: { paymentDate: "desc" },
    });

    let totalExpected = 0;
    let totalPaid = 0;

    feeDues.forEach((due) => {
      totalExpected += due.amountDue;
      totalPaid += due.amountPaid;
    });

    const totalPending = totalExpected - totalPaid;

    return NextResponse.json({
      academicYearId,
      summary: { totalExpected, totalPaid, totalPending },
      feeDues,
      payments,
    });
  } catch (error) {
    console.error("Failed to fetch student fee statement:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}