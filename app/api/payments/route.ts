import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { studentId, academicYearId, amount, paymentMethod, referenceId, remarks } = await req.json();

    if (!studentId || !academicYearId || amount <= 0) {
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

    const transactionOperations = [];

    // 2. Create the master Payment record (your receipt)
    transactionOperations.push(
      prisma.payment.create({
        data: {
          studentId,
          academicYearId,
          amount,
          paymentMethod: paymentMethod || "CASH",
          referenceId,
          remarks,
        },
      })
    );

    // 3. The FIFO Cascade Logic
    for (const due of unpaidDues) {
      if (remainingAmount <= 0) break;

      const balanceForThisDue = due.amountDue - due.amountPaid;

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
    await prisma.$transaction(transactionOperations);

    return NextResponse.json({ success: true, message: "Payment processed successfully." });
  } catch (error) {
    console.error("Payment error:", error);
    return NextResponse.json({ error: "Internal server error while processing payment." }, { status: 500 });
  }
}