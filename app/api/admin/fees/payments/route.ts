import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { studentId, academicYearId, amount, paymentMethod, referenceId, remarks } = await req.json();

    const numericAmount = Number(amount);
    if (!studentId || !academicYearId || !numericAmount || numericAmount <= 0) {
      return NextResponse.json({ error: "Invalid payment parameters" }, { status: 400 });
    }

    const transactionResult = await prisma.$transaction(async (tx) => {
      // 1. Fetch pending/partial dues ordered chronologically
      const pendingDues = await tx.feeDue.findMany({
        where: {
          studentId,
          academicYearId,
          status: { in: ["PENDING", "PARTIAL"] },
        },
        orderBy: [
          { year: "asc" },
          { month: "asc" },
          { createdAt: "asc" },
        ],
      });

      // 2. Create master Payment record
      const receiptNo = `REC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const payment = await tx.payment.create({
        data: {
          receiptNo,
          studentId,
          academicYearId,
          amount: numericAmount,
          paymentMethod: paymentMethod || "CASH",
          referenceId,
          remarks,
        },
      });

      let remainingPayment = numericAmount;
      const createdAllocations = [];

      // 3. FIFO Allocation across line items
      for (const due of pendingDues) {
        if (remainingPayment <= 0) break;

        const unpaidOnItem = due.amountDue - due.amountPaid;
        if (unpaidOnItem <= 0) continue;

        const allocAmount = Math.min(remainingPayment, unpaidOnItem);
        const newAmountPaid = due.amountPaid + allocAmount;
        const newStatus = newAmountPaid >= due.amountDue ? "PAID" : "PARTIAL";

        // Update FeeDue item status & paid total
        await tx.feeDue.update({
          where: { id: due.id },
          data: {
            amountPaid: newAmountPaid,
            status: newStatus,
          },
        });

        // Create PaymentAllocation record referencing schema relation
        const allocation = await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            feeDueId: due.id,
            amount: allocAmount,
          },
        });

        createdAllocations.push(allocation);
        remainingPayment -= allocAmount;
      }

      return { payment, allocations: createdAllocations, remainingPayment };
    });

    return NextResponse.json({ success: true, data: transactionResult });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Payment transaction failed" }, { status: 500 });
  }
}