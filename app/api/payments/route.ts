// app/api/payments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import { processPaymentAllocation } from "../../../lib/fees.server";
import { PaymentMethod } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!requireAdmin(session)) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { studentId, academicYearId, amount, paymentMethod, referenceId, remarks } = body;

    const parsedAmount = Number(amount);
    if (!studentId || !academicYearId || isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid payment details provided. studentId, academicYearId, and positive amount are required." },
        { status: 400 }
      );
    }

    // Cast or fallback to PaymentMethod enum
    const methodEnum = (paymentMethod && Object.values(PaymentMethod).includes(paymentMethod as PaymentMethod))
      ? (paymentMethod as PaymentMethod)
      : PaymentMethod.CASH;

    // 1. Process payment creation and FIFO allocation
    const allocationResult = await processPaymentAllocation(
      studentId,
      academicYearId,
      parsedAmount,
      methodEnum,
      referenceId,
      remarks
    );

    // 2. Record Audit Log
    await recordAudit(prisma, {
      actorUserId: session.user.id,
      action: "PAYMENT_COLLECT",
      entityType: "Payment",
      entityId: allocationResult.paymentId,
      after: {
        studentId,
        academicYearId,
        amountPaid: parsedAmount,
        paymentMethod: methodEnum,
        allocations: allocationResult.allocations,
        creditAdded: allocationResult.creditAdded,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Payment processed and allocated successfully.",
      paymentId: allocationResult.paymentId,
      allocatedAmount: allocationResult.allocatedAmount,
      unallocatedCredit: allocationResult.creditAdded,
      clearedBreakdown: allocationResult.allocations,
    });
  } catch (error) {
    console.error("Payment API Route Error:", error);
    return NextResponse.json(
      { error: "Internal server error while processing payment." },
      { status: 500 }
    );
  }
}