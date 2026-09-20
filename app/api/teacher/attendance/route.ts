import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["PRESENT", "ABSENT", "LATE", "LEAVE"];

export async function GET(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "TEACHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const sectionId = searchParams.get("sectionId");
  const dateParam = searchParams.get("date");

  if (!sectionId || !dateParam) {
    return NextResponse.json(
      { error: "sectionId and date are required" },
      { status: 400 }
    );
  }

  const teacher = await prisma.teacher.findFirst({
    where: { user: { username: session.user.username as string } },
    include: { assignments: true },
  });

  if (!teacher) {
    return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
  }

  const assignment = teacher.assignments.find((a) => a.sectionId === sectionId);
  if (!assignment) {
    return NextResponse.json(
      { error: "You are not assigned to this section" },
      { status: 403 }
    );
  }


  const date = new Date(dateParam);

  const enrollments = await prisma.enrollment.findMany({
    where: { sectionId, academicYearId: assignment.academicYearId },
    include: { student: true },
    orderBy: { rollNumber: "asc" },
  });

  const existing = await prisma.attendance.findMany({
    where: { sectionId, academicYearId: assignment.academicYearId, date },
  });
  const existingMap = new Map(existing.map((r) => [r.studentId, r]));

  const roster = enrollments.map((e) => ({
    studentId: e.student.id,
    studentCode: e.student.studentCode,
    firstName: e.student.firstName,
    lastName: e.student.lastName,
    rollNumber: e.rollNumber,
    status: existingMap.get(e.student.id)?.status ?? "PRESENT",
    remarks: existingMap.get(e.student.id)?.remarks ?? "",
  }));

  return NextResponse.json({ academicYearId: assignment.academicYearId, roster });
}

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "TEACHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { sectionId, date: dateParam, records } = body;

  if (!sectionId || !dateParam || !Array.isArray(records)) {
    return NextResponse.json(
      { error: "sectionId, date, and records are required" },
      { status: 400 }
    );
  }

  if (records.some((r: { status: string }) => !VALID_STATUSES.includes(r.status))) {
    return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
  }

  const teacher = await prisma.teacher.findFirst({
    where: { user: { username: session.user.username as string } },
    include: { assignments: true },
  });

  if (!teacher) {
    return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
  }

  const assignment = teacher.assignments.find((a) => a.sectionId === sectionId);
  if (!assignment) {
    return NextResponse.json(
      { error: "You are not assigned to this section" },
      { status: 403 }
    );
  }

  const date = new Date(dateParam);

  try {
    await prisma.$transaction(
      records.map((r: { studentId: string; status: string; remarks?: string }) =>
        prisma.attendance.upsert({
          where: {
            studentId_date_academicYearId: {
              studentId: r.studentId,
              date,
              academicYearId: assignment.academicYearId,
            },
          },
          update: {
            status: r.status as "PRESENT" | "ABSENT" | "LATE" | "LEAVE",
            remarks: r.remarks || null,
            markedById: teacher.userId,
            sectionId,
          },
          create: {
            studentId: r.studentId,
            date,
            academicYearId: assignment.academicYearId,
            sectionId,
            status: r.status as "PRESENT" | "ABSENT" | "LATE" | "LEAVE",
            remarks: r.remarks || null,
            markedById: teacher.userId,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save attendance." }, { status: 500 });
  }
}