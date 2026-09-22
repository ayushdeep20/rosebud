import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const academicYearId = searchParams.get("academicYearId");
  const classId = searchParams.get("classId");

  if (!academicYearId) {
    return NextResponse.json({ error: "academicYearId required" }, { status: 400 });
  }

  const dues = await prisma.feeDue.findMany({
    where: {
      academicYearId,
      status: { in: ["PENDING", "PARTIAL"] },
      ...(classId ? { student: { enrollments: { some: { section: { schoolClassId: classId } } } } } : {}),
    },
    include: {
      student: {
        include: {
          enrollments: {
            where: { academicYearId },
            include: { section: { include: { schoolClass: true } } },
          },
        },
      },
    },
  });

  // Group total outstanding dues per student
  const studentDuesMap = new Map<string, any>();

  for (const due of dues) {
    const s = due.student;
    const currentClass = s.enrollments[0]?.section?.schoolClass?.name || "N/A";
    const unpaid = due.amountDue - due.amountPaid;

    if (!studentDuesMap.has(s.id)) {
      studentDuesMap.set(s.id, {
        studentId: s.id,
        admissionNo: s.admissionNumber,
        studentName: `${s.firstName} ${s.lastName}`,
        className: currentClass,
        totalOutstanding: 0,
        pendingItemsCount: 0,
      });
    }

    const record = studentDuesMap.get(s.id);
    record.totalOutstanding += unpaid;
    record.pendingItemsCount += 1;
  }

  const defaultersList = Array.from(studentDuesMap.values()).sort(
    (a, b) => b.totalOutstanding - a.totalOutstanding
  );

  return NextResponse.json({
    success: true,
    totalDefaulters: defaultersList.length,
    data: defaultersList,
  });
}