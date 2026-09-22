// app/api/fees/student-dues/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  const academicYearId = searchParams.get("academicYearId");

  if (!studentId || !academicYearId) {
    return NextResponse.json(
      { error: "studentId and academicYearId are required" },
      { status: 400 }
    );
  }

  const dues = await prisma.feeDue.findMany({
    where: { studentId, academicYearId },
    include: {
      allocations: {
        include: {
          payment: {
            select: {
              id: true,
              receiptNo: true,
              paymentDate: true,
              paymentMethod: true,
            },
          },
        },
      },
    },
    orderBy: [{ year: "asc" }, { month: "asc" }, { feeType: "asc" }],
  });

  const payments = await prisma.payment.findMany({
    where: { studentId, academicYearId },
    include: {
      allocations: {
        include: {
          feeDue: {
            select: { feeType: true, month: true, year: true, amountDue: true },
          },
        },
      },
    },
    orderBy: { paymentDate: "desc" },
  });

  const MONTH_NAMES = [
    "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  const FEE_TYPE_LABELS: Record<string, string> = {
    TUITION: "Tuition",
    HOSTEL: "Hostel / Mess",
    TRANSPORT: "Transport",
    ADMISSION: "Admission",
    ANNUAL: "Annual Fee",
    PREVIOUS_DUES: "Opening Balance",
    OTHER: "Other",
  };

  const formattedDues = dues.map((d) => {
    const totalAllocated = d.allocations.reduce((sum, a) => sum + a.amount, 0);
    const balance = d.amountDue - totalAllocated;
    const monthLabel =
      d.month === 0
        ? "Opening Balance"
        : `${MONTH_NAMES[d.month] ?? "?"} ${d.year}`;

    return {
      id: d.id,
      feeType: d.feeType,
      feeTypeLabel: FEE_TYPE_LABELS[d.feeType] ?? d.feeType,
      month: d.month,
      year: d.year,
      monthLabel,
      description: d.description,
      amountDue: d.amountDue,
      amountPaid: totalAllocated,
      balance: Math.max(0, balance),
      status: d.status,
    };
  });

  const formattedPayments = payments.map((p) => ({
    id: p.id,
    receiptNo: p.receiptNo,
    amount: p.amount,
    paymentDate: p.paymentDate,
    paymentMethod: p.paymentMethod,
    allocations: p.allocations.map((a) => ({
      feeDueId: a.feeDueId,
      amount: a.amount,
      feeType: FEE_TYPE_LABELS[a.feeDue.feeType] ?? a.feeDue.feeType,
      monthLabel:
        a.feeDue.month === 0
          ? "Opening Balance"
          : `${MONTH_NAMES[a.feeDue.month] ?? "?"} ${a.feeDue.year}`,
    })),
  }));

  return NextResponse.json({ dues: formattedDues, payments: formattedPayments });
}