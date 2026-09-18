// app/api/teacher-assignments/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const assignments = await prisma.teacherAssignment.findMany({
    include: {
      teacher: true,
      subject: true,
      section: { include: { schoolClass: true } },
      academicYear: true,
    },
    orderBy: { academicYear: { startDate: "desc" } },
  });

  return NextResponse.json(assignments);
}

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { staffId, subjectId, sectionId, academicYearId, isClassTeacher } =
    body;

  if (!staffId || !subjectId || !sectionId || !academicYearId) {
    return NextResponse.json(
      {
        error:
          "staffId, subjectId, sectionId, and academicYearId are required",
      },
      { status: 400 }
    );
  }

  // Find the Staff member to get their linked User
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: { user: true },
  });

  if (!staff) {
    return NextResponse.json(
      { error: "Staff member not found" },
      { status: 404 }
    );
  }

  if (!staff.userId || !staff.user) {
    return NextResponse.json(
      {
        error:
          "This staff member has no portal login — create one before assigning classes.",
      },
      { status: 400 }
    );
  }

  try {
    // Find or create a Teacher record linked to the same User
    const teacher = await prisma.teacher.upsert({
      where: { userId: staff.userId },
      update: {},
      create: {
        firstName: staff.firstName,
        lastName: staff.lastName,
        phone: staff.phone,
        userId: staff.userId,
      },
    });

    const assignment = await prisma.teacherAssignment.create({
      data: {
        teacherId: teacher.id,
        subjectId,
        sectionId,
        academicYearId,
        isClassTeacher: isClassTeacher ?? false,
      },
      include: {
        teacher: true,
        subject: true,
        section: { include: { schoolClass: true } },
        academicYear: true,
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json(
        { error: "This assignment already exists." },
        { status: 409 }
      );
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create assignment." },
      { status: 500 }
    );
  }
}