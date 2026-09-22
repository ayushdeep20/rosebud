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
  // Boarding & transport, set at admission time. Both default to false
  // (day scholar, no bus) when omitted.
  hostelFacility?: boolean;
  busFacility?: boolean;
  busNo?: string | null;
  busPoint?: string | null;
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

  const isBoarder = input.hostelFacility === true;
  // A boarder never travels by the school bus (there is no boarder
  // transport fee on the rate card), regardless of what was ticked.
  const usesBus = !isBoarder && input.busFacility === true;

  const student = await tx.student.create({
    data: {
      studentCode,
      admissionNumber: input.admissionNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: new Date(input.dateOfBirth),
      gender: input.gender || null,
      aadhaarEncrypted: input.aadhaarNumber ? encryptValue(input.aadhaarNumber) : null,
      hostelFacility: isBoarder,
      busFacility: usesBus,
      busNo: usesBus ? input.busNo || null : null,
      busPoint: usesBus ? input.busPoint || null : null,
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
      after: {
        studentCode: result.studentCode,
        admissionNumber: input.admissionNumber,
        hostelFacility: input.hostelFacility === true,
        busFacility: input.hostelFacility !== true && input.busFacility === true,
      },
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

export type BoardingTransportUpdate = {
  hostelFacility?: boolean;
  busFacility?: boolean;
  busNo?: string | null;
  busPoint?: string | null;
};

// Updates a student's boarding / transport status. This is the one
// place these flags change after admission, so a student moving in or
// out of the hostel, or starting or stopping the bus, is always
// recorded here with an audit trail of who changed what and when.
//
// Fee amounts already generated for past or already-billed months are
// never rewritten by this — see the note in app/api/fees/generate.
// Only fees generated AFTER this change will reflect the new status.
export async function updateBoardingTransport(
  studentId: string,
  update: BoardingTransportUpdate,
  actorUserId: string
) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) {
    throw new Error("Student not found");
  }

  const nextHostel = update.hostelFacility ?? student.hostelFacility;
  // A boarder never pays transport separately - mess covers meals, and
  // there's no boarder bus rate on the fee sheet.
  const nextBus = nextHostel ? false : update.busFacility ?? student.busFacility;
  const nextBusNo = nextBus ? update.busNo ?? student.busNo : null;
  const nextBusPoint = nextBus ? update.busPoint ?? student.busPoint : null;

  const before = {
    hostelFacility: student.hostelFacility,
    busFacility: student.busFacility,
    busNo: student.busNo,
    busPoint: student.busPoint,
  };
  const after = {
    hostelFacility: nextHostel,
    busFacility: nextBus,
    busNo: nextBusNo,
    busPoint: nextBusPoint,
  };

  const unchanged =
    before.hostelFacility === after.hostelFacility &&
    before.busFacility === after.busFacility &&
    before.busNo === after.busNo &&
    before.busPoint === after.busPoint;

  if (unchanged) {
    return { student, changed: false };
  }

  const [updated] = await prisma.$transaction([
    prisma.student.update({ where: { id: studentId }, data: after }),
    prisma.auditLog.create({
      data: {
        actorUserId,
        action: "STUDENT_BOARDING_TRANSPORT_UPDATE",
        entityType: "Student",
        entityId: studentId,
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify(after),
      },
    }),
  ]);

  return { student: updated, changed: true };
}
