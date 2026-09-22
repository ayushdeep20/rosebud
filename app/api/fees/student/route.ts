// app/api/fees/student/route.ts
//
// Returns the logged-in student's own fee dues and payment history.
// This is read-only and scoped to whoever is logged in -- a student can
// only ever see their own data, determined from the session, never from
// a studentId the client sends.

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
  });

  if (!student) {
    return NextResponse.json(
      { error: "No student record is linked to this login." },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(request.url);
  const requestedYearId = searchParams.get("academicYearId");

  const academicYear = requestedYearId
    ? await prisma.academicYear.findUnique({ where: { id: requestedYearId } })
    : await prisma.academicYear.findFirst({ where: { isCurrent: true } });

  if (!academicYear) {
    return NextResponse.json(
      {
        error: requestedYearId
          ? "That academic year was not found."
          : "No academic year is marked as current -- ask Admin to set one, or pass ?academicYearId=.",
      },
      { status: 400 }
    );
  }

  const dues = await prisma.feeDue.findMany({
    where: { studentId: student.id, academicYearId: academicYear.id },
  });

  // Opening-balance rows (imported historical arrears) are stored with
  // month = 0 as a placeholder -- they don't belong to a real calendar
  // month, so they sort before everything else and are flagged here
  // rather than fed into any Date() math (that's what caused the old
  // "December 2026" bug on the admin side).
  const sortedDues = [...dues].sort((a, b) => {
    const keyA = a.month === 0 ? -1 : a.year * 12 + a.month;
    const keyB = b.month === 0 ? -1 : b.year * 12 + b.month;
    return keyA - keyB;
  });

  const dueRows = sortedDues.map((d) => ({
    id: d.id,
    feeType: d.feeType,
    month: d.month,
    year: d.year,
    isOpeningBalance: d.month === 0,
    description: d.description,
    amountDue: d.amountDue,
    amountPaid: d.amountPaid,
    balance: Math.max(d.amountDue - d.amountPaid, 0),
    status: d.status,
    dueDate: d.dueDate,
  }));

  const payments = await prisma.payment.findMany({
    where: { studentId: student.id, academicYearId: academicYear.id },
    include: { allocations: true },
    orderBy: { paymentDate: "desc" },
  });

  const paymentRows = payments.map((p) => ({
    id: p.id,
    receiptNo: p.receiptNo,
    amount: p.amount,
    paymentDate: p.paymentDate,
    paymentMethod: p.paymentMethod,
    referenceId: p.referenceId,
    remarks: p.remarks,
    allocations: p.allocations.map((a) => ({
      feeDueId: a.feeDueId,
      amount: a.amount,
    })),
  }));

  const totalDue = dueRows.reduce((sum, d) => sum + d.amountDue, 0);
  const totalPaid = dueRows.reduce((sum, d) => sum + d.amountPaid, 0);

  return NextResponse.json({
    student: {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
    },
    academicYear: { id: academicYear.id, label: academicYear.label },
    summary: {
      totalDue,
      totalPaid,
      totalPending: Math.max(totalDue - totalPaid, 0),
    },
    dues: dueRows,
    payments: paymentRows,
  });
}
