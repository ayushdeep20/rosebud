// lib/students/service.ts
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateStudentId } from "@/lib/studentId";
import { encryptValue } from "@/lib/encryption";
import { recordAudit } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

export type NewStudentInput = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  admissionNumber: string;
  gender?: string | null;
  academicYearId: string;
  sectionId: string;
  rollNumber?: string | number | null;
  aadhaarNumber?: string | null;
};

export type CreatedStudent = {
  studentId: string;
  studentCode: string;
  username: string;
  tempPassword: string;
};

// The one place a Student + User + Enrollment gets created.
// Used by both the single "Add Student" form and the bulk importer,
// so the two paths can never quietly drift apart.
export async function createStudentInTx(
  tx: Prisma.TransactionClient,
  input: NewStudentInput,
  academicYearLabel: string
): Promise<CreatedStudent> {
  const studentCode = await generateStudentId(tx, academicYearLabel);
  const username = studentCode.replace(/-/g, "").toLowerCase();
  const tempPassword = `${input.lastName}@${input.admissionNumber}`.slice(0, 20);
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
      admissionNumber: input.admissionNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: new Date(input.dateOfBirth),
      gender: input.gender || null,
      aadhaarEncrypted: input.aadhaarNumber ? encryptValue(input.aadhaarNumber) : null,
      userId: user.id,
    },
  });

  await tx.enrollment.create({
    data: {
      studentId: student.id,
      sectionId: input.sectionId,
      academicYearId: input.academicYearId,
      rollNumber: input.rollNumber ? Number(input.rollNumber) : null,
    },
  });

  return { studentId: student.id, studentCode, username, tempPassword };
}

// Single-student creation, used by the "Add Student" form.
export async function createStudent(
  input: NewStudentInput,
  actorUserId: string
): Promise<CreatedStudent> {
  const academicYear = await prisma.academicYear.findUnique({
    where: { id: input.academicYearId },
  });
  if (!academicYear) {
    throw new Error("Academic year not found");
  }

  return prisma.$transaction(async (tx) => {
    const result = await createStudentInTx(tx, input, academicYear.label);
    await recordAudit(tx, {
      actorUserId,
      action: "STUDENT_CREATE",
      entityType: "Student",
      entityId: result.studentId,
      after: { studentCode: result.studentCode, admissionNumber: input.admissionNumber },
    });
    return result;
  });
}

export async function listStudents() {
  return prisma.student.findMany({
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
}