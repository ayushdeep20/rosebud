import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { academicYearId, month, year, classId } = await req.json();

    if (!academicYearId || !month || !year) {
      return NextResponse.json(
        { error: "academicYearId, month, and year are required." },
        { status: 400 }
      );
    }

    // 1. Fetch target enrollments (Whole School or single class filter)
    const enrollments = await prisma.enrollment.findMany({
      where: {
        academicYearId,
        ...(classId ? { section: { schoolClassId: classId } } : {}),
      },
      include: {
        student: true,
        section: { include: { schoolClass: true } },
      },
    });

    if (enrollments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active enrollments found for the specified criteria.",
        recordsCreated: 0,
      });
    }

    // 2. Load all Fee Structures defined for the Academic Year
    const feeStructures = await prisma.feeStructure.findMany({
      where: { academicYearId },
    });

    // Quick lookup map: "classId_isBoarder_feeType" -> amount
    const structureMap = new Map<string, number>();
    feeStructures.forEach((s) => {
      structureMap.set(`${s.schoolClassId}_${s.isBoarder}_${s.feeType}`, s.amount);
    });

    const duesToCreate: Array<{
      studentId: string;
      academicYearId: string;
      feeType: any;
      month: number;
      year: number;
      amountDue: number;
      amountPaid: number;
      status: any;
      description: string;
    }> = [];

    // 3. Evaluate fee eligibility for every student in the school
    for (const enrollment of enrollments) {
      const { student, section } = enrollment;
      const classId = section.schoolClassId;
      const isBoarder = student.hostelFacility;

      // Match applicable rates for this student's class and boarding type
      const classRates = feeStructures.filter(
        (s) => s.schoolClassId === classId && s.isBoarder === isBoarder
      );

      for (const rate of classRates) {
        // Skip facility fees if student has not opted in
        if (rate.feeType === "TRANSPORT" && !student.busFacility) continue;
        if (rate.feeType === "HOSTEL" && !student.hostelFacility) continue;

        duesToCreate.push({
          studentId: student.id,
          academicYearId,
          feeType: rate.feeType,
          month: Number(month),
          year: Number(year),
          amountDue: rate.amount,
          amountPaid: 0,
          status: "PENDING",
          description: `${rate.feeType} Fee (${month}/${year})`,
        });
      }
    }

    // 4. Batch insert with skipDuplicates (uses Prisma's unique constraint)
    const result = await prisma.feeDue.createMany({
      data: duesToCreate,
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      message: `Generated fees for ${enrollments.length} students across the school.`,
      recordsCreated: result.count,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}