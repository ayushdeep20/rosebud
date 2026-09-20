import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, FeeType } from "@prisma/client";

const prisma = new PrismaClient();

// In a real app, you might fetch these amounts from a settings table, 
// but we'll define them here for simplicity.
const TUITION_FEE_AMOUNT = 5000;
const HOSTEL_FEE_AMOUNT = 3000;

export async function POST(req: NextRequest) {
  try {
    const { month, year, academicYearId } = await req.json();

    if (!month || !year || !academicYearId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Fetch all active students for this academic year
    const enrollments = await prisma.enrollment.findMany({
      where: { academicYearId },
      include: { student: true },
    });

    let generatedCount = 0;

    // 2. Loop through and generate dues
    for (const enrollment of enrollments) {
      const student = enrollment.student;

      // Create Tuition Fee Due
      await prisma.feeDue.upsert({
        where: {
          studentId_academicYearId_feeType_month_year: {
            studentId: student.id,
            academicYearId,
            feeType: FeeType.TUITION,
            month,
            year,
          },
        },
        update: {}, // Do nothing if it already exists (prevents duplicate billing)
        create: {
          studentId: student.id,
          academicYearId,
          feeType: FeeType.TUITION,
          month,
          year,
          amountDue: TUITION_FEE_AMOUNT,
        },
      });
      generatedCount++;

      // Create Hostel Fee Due ONLY if they are in the hostel
      if (student.hostelFacility) {
        await prisma.feeDue.upsert({
          where: {
            studentId_academicYearId_feeType_month_year: {
              studentId: student.id,
              academicYearId,
              feeType: FeeType.HOSTEL,
              month,
              year,
            },
          },
          update: {}, 
          create: {
            studentId: student.id,
            academicYearId,
            feeType: FeeType.HOSTEL,
            month,
            year,
            amountDue: HOSTEL_FEE_AMOUNT,
          },
        });
        generatedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully generated ${generatedCount} fee records for ${month}/${year}.` 
    }, { status: 200 });

  } catch (error) {
    console.error("Fee Generation Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}