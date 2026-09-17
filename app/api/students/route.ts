// app/api/students/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateStudentId } from "@/lib/studentId";
import { encryptValue } from "@/lib/encryption";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const students = await prisma.student.findMany({
    include: {
      enrollments: {
        include: {
          section: { include: { schoolClass: true } },
          academicYear: true,
        },
        orderBy: { academicYear: { startDate: "desc" } },
        take: 1,
      },
    },
    orderBy: { studentCode: "asc" },
  });

  return NextResponse.json(students);
}

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    firstName,
    lastName,
    dateOfBirth,
    admissionNumber,
    gender,
    academicYearId,
    sectionId,
    rollNumber,
    aadhaarNumber,
  } = body;

  if (
    !firstName ||
    !lastName ||
    !dateOfBirth ||
    !admissionNumber ||
    !academicYearId ||
    !sectionId
  ) {
    return NextResponse.json(
      {
        error:
          "firstName, lastName, dateOfBirth, admissionNumber, academicYearId, and sectionId are required",
      },
      { status: 400 }
    );
  }

  const academicYear = await prisma.academicYear.findUnique({
    where: { id: academicYearId },
  });
  if (!academicYear) {
    return NextResponse.json(
      { error: "Academic year not found" },
      { status: 404 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const studentCode = await generateStudentId(tx, academicYear.label);
      const username = studentCode.replace(/-/g, "").toLowerCase();
      const tempPassword = `${lastName}@${admissionNumber}`.slice(0, 20);
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      const user = await tx.user.create({
        data: {
          username,
          passwordHash,
          role: "STUDENT",
          mustChangePassword: true,
        },
      });

      const student = await tx.student.create({
        data: {
          studentCode,
          admissionNumber,
          firstName,
          lastName,
          dateOfBirth: new Date(dateOfBirth),
          gender: gender || null,
          aadhaarEncrypted: aadhaarNumber ? encryptValue(aadhaarNumber) : null,
          userId: user.id,
        },
      });

      await tx.enrollment.create({
        data: {
          studentId: student.id,
          sectionId,
          academicYearId,
          rollNumber: rollNumber ? Number(rollNumber) : null,
        },
      });

      return { student, username, tempPassword };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json(
        { error: "A student with that admission number already exists." },
        { status: 409 }
      );
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create student." },
      { status: 500 }
    );
  }
}