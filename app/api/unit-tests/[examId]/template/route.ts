import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildUnitTestTemplate } from "@/lib/unitTest";

export async function GET(
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
    include: { section: { include: { schoolClass: true } } },
  });

  if (!exam || exam.type !== "UNIT_TEST") {
    return NextResponse.json({ error: "Unit test not found" }, { status: 404 });
  }

  if (role !== "ADMIN" && exam.createdById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { sectionId: exam.sectionId, academicYearId: exam.academicYearId },
    include: { student: true },
    orderBy: { rollNumber: "asc" },
  });

  if (enrollments.length === 0) {
    return NextResponse.json(
      { error: "No students are enrolled in this section for the selected academic year." },
      { status: 400 }
    );
  }

  const students = enrollments.map((e) => ({
    rollNumber: e.rollNumber,
    name: `${e.student.firstName} ${e.student.lastName}`,
  }));

  const buffer = buildUnitTestTemplate(students);
  const sanitizedFilename = `${exam.section.schoolClass.name}-${exam.section.name}-${exam.name}`.replace(/\s+/g, "_");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${sanitizedFilename}-template.xlsx"`,
    },
  });
}