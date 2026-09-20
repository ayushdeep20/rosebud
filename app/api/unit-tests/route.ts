// app/api/unit-tests/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;

  if (role !== "TEACHER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Admins see all unit tests; teachers see unit tests created by them
  const whereCondition =
    role === "ADMIN"
      ? { type: "UNIT_TEST" as const }
      : { type: "UNIT_TEST" as const, createdById: session.user.id };

  const exams = await prisma.exam.findMany({
    where: whereCondition,
    include: {
      subject: true,
      section: { include: { schoolClass: true } },
      academicYear: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(exams);
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;

  if (role !== "TEACHER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    academicYearId?: string;
    subjectId?: string;
    sectionId?: string;
    name?: string;
    totalMarks?: number | string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request payload" },
      { status: 400 }
    );
  }

  const { academicYearId, subjectId, sectionId, name, totalMarks } = body;

  if (!academicYearId || !subjectId || !sectionId || !name || totalMarks === undefined) {
    return NextResponse.json(
      {
        error:
          "academicYearId, subjectId, sectionId, name, and totalMarks are required",
      },
      { status: 400 }
    );
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return NextResponse.json(
      { error: "Exam name cannot be empty" },
      { status: 400 }
    );
  }

  const totalMarksNum = Number(totalMarks);
  if (isNaN(totalMarksNum) || totalMarksNum <= 0) {
    return NextResponse.json(
      { error: "totalMarks must be a positive number" },
      { status: 400 }
    );
  }

  // Teacher Assignment Authorization Check
  if (role === "TEACHER") {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: "Teacher profile not found" },
        { status: 404 }
      );
    }

    const assignment = await prisma.teacherAssignment.findFirst({
      where: {
        teacherId: teacher.id,
        subjectId,
        sectionId,
        academicYearId,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        {
          error:
            "Forbidden: You are not assigned to teach this subject and section for the selected academic year.",
        },
        { status: 403 }
      );
    }
  }

  try {
    const exam = await prisma.exam.create({
      data: {
        name: trimmedName,
        type: "UNIT_TEST",
        academicYearId,
        sectionId,
        subjectId,
        totalMarks: totalMarksNum,
        createdById: session.user.id,
      },
      include: {
        subject: true,
        section: { include: { schoolClass: true } },
        academicYear: true,
      },
    });

    return NextResponse.json(exam, { status: 201 });
  } catch (error) {
    console.error("Failed to create unit test exam:", error);
    return NextResponse.json(
      { error: "Failed to create unit test. Verify that subject, section, and academic year exist." },
      { status: 400 }
    );
  }
}