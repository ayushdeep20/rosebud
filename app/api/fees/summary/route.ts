import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sectionId = url.searchParams.get("sectionId");
  const academicYearId = url.searchParams.get("academicYearId");

  if (!sectionId || !academicYearId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    const enrollments = await prisma.enrollment.findMany({
      where: { sectionId, academicYearId },
      include: {
        student: {
          include: {
            feeDues: {
              where: {
                academicYearId,
                status: { not: "PAID" },
              },
            },
          },
        },
      },
    });

    const studentSummaries = enrollments.map((enr) => {
      const pendingTotal = enr.student.feeDues.reduce((sum, due) => sum + (due.amountDue - due.amountPaid), 0);
      return {
        studentId: enr.student.id,
        name: `${enr.student.firstName} ${enr.student.lastName}`,
        rollNumber: enr.rollNumber,
        isHosteler: enr.student.hostelFacility,
        pendingTotal,
        monthsPending: enr.student.feeDues.length,
      };
    });

    return NextResponse.json(studentSummaries);
  } catch (error) {
    console.error("Summary fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch summaries" }, { status: 500 });
  }
}