import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { academicYearId, records } = body; 
    // records expected format: [{ admissionNumber: "1846", dues: 3800 }, ...]

    if (!academicYearId || !records || !Array.isArray(records)) {
      return NextResponse.json({ error: "Missing academicYearId or records array." }, { status: 400 });
    }

    let importedCount = 0;
    let skippedCount = 0;

    for (const row of records) {
      // Find the student by admission number
      const student = await prisma.student.findUnique({
        where: { admissionNumber: String(row.admissionNumber).trim() },
      });

      if (!student) {
        skippedCount++;
        continue;
      }

      const duesAmount = parseFloat(row.dues);
      if (isNaN(duesAmount) || duesAmount <= 0) continue;

      // Check if an opening balance (month: 0) already exists for this student in this academic year
      const existingOpening = await prisma.feeDue.findFirst({
        where: {
          studentId: student.id,
          academicYearId,
          month: 0,
        },
      });

      if (existingOpening) {
        // Update existing opening balance
        await prisma.feeDue.update({
          where: { id: existingOpening.id },
          data: { amountDue: duesAmount },
        });
      } else {
        // Create new opening balance record (month: 0 ensures top FIFO priority)
        await prisma.feeDue.create({
          data: {
            studentId: student.id,
            academicYearId,
            feeType: "TUITION",
            month: 0,
            year: 2026,
            amountDue: duesAmount,
            amountPaid: 0,
            status: "PENDING",
          },
        });
      }

      importedCount++;
    }

    return NextResponse.json({
      success: true,
      importedCount,
      skippedCount,
      message: `Successfully imported opening balances for ${importedCount} students. Skipped ${skippedCount} unknown admission numbers.`,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Internal server error during import." }, { status: 500 });
  }
}