import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { studentId, academicYearId, amount, paymentMethod, referenceId, remarks } = await req.json();

    if (!studentId || !academicYearId || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid payment details provided." }, { status: 400 });
    }

    let remainingAmount = amount;

    // 1. Fetch all unpaid dues chronologically (oldest month first)
    const unpaidDues = await prisma.feeDue.findMany({
      where: {
        studentId,
        academicYearId,
        status: { not: "PAID" },
      },
      orderBy: [
        { year: "asc" },
        { month: "asc" },
      ],
    });

    const clearedBreakdown: { feeType: string; month: number; year: number; amount: number }[] = [];

    const transactionOperations = [];

    // 2. Create the master Payment record (your receipt)
    const payment = prisma.payment.create({
      data: {
        studentId,
        academicYearId,
        amount,
        paymentMethod: paymentMethod || "CASH",
        referenceId,
        remarks,
      },
    });
    transactionOperations.push(payment);

    // 3. The FIFO Cascade Logic
    for (const due of unpaidDues) {
      if (remainingAmount <= 0) break;

      const balanceForThisDue = due.amountDue - due.amountPaid;
      const appliedToThisDue = Math.min(remainingAmount, balanceForThisDue);
      clearedBreakdown.push({
        feeType: due.feeType,
        month: due.month,
        year: due.year,
        amount: appliedToThisDue,
      });

      if (remainingAmount >= balanceForThisDue) {
        // The payment completely clears this specific month
        remainingAmount -= balanceForThisDue;
        transactionOperations.push(
          prisma.feeDue.update({
            where: { id: due.id },
            data: {
              amountPaid: due.amountDue,
              status: "PAID",
            },
          })
        );
      } else {
        // The payment only partially clears this month, emptying the remaining cash
        transactionOperations.push(
          prisma.feeDue.update({
            where: { id: due.id },
            data: {
              amountPaid: due.amountPaid + remainingAmount,
              status: "PARTIAL",
            },
          })
        );
        remainingAmount = 0;
      }
    }

    // 4. Execute all database writes simultaneously
    const [createdPayment] = await prisma.$transaction(transactionOperations);

    await recordAudit(prisma, {
      actorUserId: session.user.id,
      action: "PAYMENT_COLLECT",
      entityType: "Payment",
      entityId: createdPayment.id,
      after: { studentId, academicYearId, amount, paymentMethod: paymentMethod || "CASH", clearedBreakdown },
    });

    return NextResponse.json({
      success: true,
      message: "Payment processed successfully.",
      clearedBreakdown,
      unallocated: remainingAmount, // >0 if the amount paid more than everything currently due
    });
  } catch (error) {
    console.error("Payment error:", error);
    return NextResponse.json({ error: "Internal server error while processing payment." }, { status: 500 });
  }
}
