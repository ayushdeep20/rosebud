// lib/fees.server.ts
import { prisma } from "@/lib/prisma";
import { PaymentMethod } from "@prisma/client";

export type AllocationResult = {
  paymentId: string;
  amountPaid: number;
  allocatedAmount: number;
  creditAdded: number;
  allocations: Array<{
    feeDueId: string;
    amount: number;
    month: number;
    year: number;
  }>;
};

/**
 * Calculates a student's total due, total paid, and current balance 
 * across all fee dues.
 */
export async function getStudentFeeSummary(studentId: string, academicYearId: string) {
  const dues = await prisma.feeDue.findMany({
    where: { studentId, academicYearId },
    include: {
      allocations: true,
    },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  const payments = await prisma.payment.findMany({
    where: { studentId, academicYearId },
    include: { allocations: true },
    orderBy: { createdAt: "desc" },
  });

  let totalDue = 0;
  let totalPaid = 0;

  const dueBreakdown = dues.map((due) => {
    const paidForThisDue = due.allocations.reduce(
      (sum, alloc) => sum + Number(alloc.amount),
      0
    );
    const amountNum = Number(due.amountDue);
    const outstanding = Math.max(0, amountNum - paidForThisDue);

    totalDue += amountNum;
    totalPaid += paidForThisDue;

    return {
      id: due.id,
      feeType: due.feeType,
      month: due.month, // 0 = Opening Balance / Defaulter Amount
      year: due.year,
      amount: amountNum,
      paid: paidForThisDue,
      outstanding,
      isFullyPaid: outstanding === 0,
    };
  });

  return {
    studentId,
    academicYearId,
    totalDue,
    totalPaid,
    totalOutstanding: Math.max(0, totalDue - totalPaid),
    dueBreakdown,
    payments: payments.map((p) => ({
      id: p.id,
      referenceId: p.referenceId,
      amount: Number(p.amount),
      paymentMethod: p.paymentMethod,
      createdAt: p.createdAt,
    })),
  };
}

/**
 * Executes FIFO Waterfall Payment Allocation:
 * Allocates payments to the oldest pending dues first.
 */
export async function processPaymentAllocation(
  studentId: string,
  academicYearId: string,
  amountPaid: number,
  paymentMethod: PaymentMethod = PaymentMethod.CASH,
  referenceId?: string,
  remarks?: string
): Promise<AllocationResult> {
  return await prisma.$transaction(async (tx) => {
    // 1. Get all pending or partially paid dues ordered chronologically
    const dues = await tx.feeDue.findMany({
      where: {
        studentId,
        academicYearId,
        status: { not: "PAID" },
      },
      include: { allocations: true },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });

    // 2. Create master payment record matching Prisma enum type
    const payment = await tx.payment.create({
      data: {
        studentId,
        academicYearId,
        amount: amountPaid,
        paymentMethod,
        referenceId: referenceId || `REC-${Date.now()}`,
        remarks,
      },
    });

    let remainingFunds = amountPaid;
    const allocatedRecords: Array<{
      feeDueId: string;
      amount: number;
      month: number;
      year: number;
    }> = [];

    // 3. FIFO Cascade through oldest unpaid dues
    for (const due of dues) {
      if (remainingFunds <= 0) break;

      const currentAllocated = due.allocations.reduce(
        (sum, a) => sum + Number(a.amount),
        0
      );
      const pendingOnDue = Number(due.amountDue) - currentAllocated;

      if (pendingOnDue > 0) {
        const allocation = Math.min(remainingFunds, pendingOnDue);

        // Create individual PaymentAllocation record
        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            feeDueId: due.id,
            amount: allocation,
          },
        });

        // Update feeDue balance & status
        const newTotalPaid = currentAllocated + allocation;
        const isFullyPaid = newTotalPaid >= Number(due.amountDue);

        await tx.feeDue.update({
          where: { id: due.id },
          data: {
            amountPaid: newTotalPaid,
            status: isFullyPaid ? "PAID" : "PARTIAL",
          },
        });

        remainingFunds -= allocation;
        allocatedRecords.push({
          feeDueId: due.id,
          amount: allocation,
          month: due.month,
          year: due.year,
        });
      }
    }

    return {
      paymentId: payment.id,
      amountPaid,
      allocatedAmount: amountPaid - remainingFunds,
      creditAdded: remainingFunds,
      allocations: allocatedRecords,
    };
  });
}