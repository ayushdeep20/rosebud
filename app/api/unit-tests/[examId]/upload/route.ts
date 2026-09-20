import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseMarksSheet, validateMarksRows } from "@/lib/unitTest";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== "TEACHER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { examId } = await params;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
  });

  if (!exam || exam.type !== "UNIT_TEST" || !exam.subjectId || !exam.totalMarks) {
    return NextResponse.json({ error: "Unit test not found" }, { status: 404 });
  }

  if (role !== "ADMIN" && exam.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { sectionId: exam.sectionId, academicYearId: exam.academicYearId },
    include: { student: true },
  });

  const rollToStudent = new Map<number, { id: string; name: string }>();
  for (const e of enrollments) {
    if (e.rollNumber !== null) {
      rollToStudent.set(e.rollNumber, {
        id: e.student.id,
        name: `${e.student.firstName} ${e.student.lastName}`,
      });
    }
  }

  let rows;
  try {
    const arrayBuffer = await file.arrayBuffer();
    const parsed = parseMarksSheet(arrayBuffer);
    rows = validateMarksRows(parsed, rollToStudent, exam.totalMarks);
  } catch (error) {
    console.error("Failed to parse Excel file:", error);
    return NextResponse.json(
      { error: "Could not read the uploaded file. Make sure it's a valid Excel file." },
      { status: 400 }
    );
  }

  const invalidRows = rows.filter((r) => r.status === "invalid");
  const validRows = rows.filter((r) => r.status === "valid");

  if (invalidRows.length > 0) {
    return NextResponse.json(
      {
        error: `${invalidRows.length} row(s) had errors. Nothing was saved — fix these and re-upload.`,
        invalidRows: invalidRows.map((r) => ({
          rowNumber: r.rowNumber,
          reason: r.reason,
        })),
      },
      { status: 422 }
    );
  }

  if (validRows.length === 0) {
    return NextResponse.json(
      { error: "No valid rows found in the uploaded file." },
      { status: 422 }
    );
  }

  try {
    await prisma.$transaction(
      validRows.map((row) =>
        prisma.subjectMark.upsert({
          where: {
            examId_studentId_subjectId: {
              examId: exam.id,
              studentId: row.studentId!,
              subjectId: exam.subjectId!,
            },
          },
                    update: {
            marksObtained: row.marks,
            isAbsent: row.isAbsent ?? false,
          },
          create: {
            examId: exam.id,
            studentId: row.studentId!,
            subjectId: exam.subjectId!,
            marksObtained: row.marks,
            isAbsent: row.isAbsent ?? false,
          },
        })
      )
    );

    return NextResponse.json({ saved: validRows.length }, { status: 200 });
  } catch (error) {
    console.error("Failed to save marks:", error);
    return NextResponse.json(
      { error: "Failed to save marks to the database." },
      { status: 500 }
    );
  }
}