import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    // In your authentication setup, you likely extract the logged-in user/student ID from headers, session, or query params.
    // For this example, we'll accept `studentId` as a search parameter.
    const url = new URL(req.url);
    const studentId = url.searchParams.get("studentId");
    const academicYearId = url.searchParams.get("academicYearId");

    if (!studentId || !academicYearId) {
      return NextResponse.json({ error: "Missing studentId or academicYearId" }, { status: 400 });
    }

    // 1. Fetch all fee dues for this student
    const feeDues = await prisma.feeDue.findMany({
      where: { studentId, academicYearId },
      orderBy: [
        { year: "asc" },
        { month: "asc" },
      ],
    });

    // 2. Fetch payment history receipts
    const payments = await prisma.payment.findMany({
      where: { studentId, academicYearId },
      orderBy: { paymentDate: "desc" },
    });

    // 3. Calculate summary metrics
    let totalExpected = 0;
    let totalPaid = 0;

    feeDues.forEach((due) => {
      totalExpected += due.amountDue;
      totalPaid += due.amountPaid;
    });

    const totalPending = totalExpected - totalPaid;

    return NextResponse.json({
      summary: {
        totalExpected,
        totalPaid,
        totalPending,
      },
      feeDues,
      payments,
    });
  } catch (error) {
    console.error("Failed to fetch student fee statement:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}