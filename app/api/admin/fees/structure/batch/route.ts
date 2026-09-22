import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { academicYearId, structures } = await req.json();

    // Expected format for structures array:
    // [{ schoolClassId: "cls_1", isBoarder: false, feeType: "TUITION", amount: 1500 }, ...]

    if (!academicYearId || !Array.isArray(structures)) {
      return NextResponse.json(
        { error: "academicYearId and structures array are required." },
        { status: 400 }
      );
    }

    const upsertTransactions = structures.map((item) =>
      prisma.feeStructure.upsert({
        where: {
          academicYearId_schoolClassId_isBoarder_feeType: {
            academicYearId,
            schoolClassId: item.schoolClassId,
            isBoarder: Boolean(item.isBoarder),
            feeType: item.feeType,
          },
        },
        update: { amount: Number(item.amount) },
        create: {
          academicYearId,
          schoolClassId: item.schoolClassId,
          isBoarder: Boolean(item.isBoarder),
          feeType: item.feeType,
          amount: Number(item.amount),
        },
      })
    );

    const results = await prisma.$transaction(upsertTransactions);

    return NextResponse.json({
      success: true,
      message: `Updated ${results.length} fee structure rules for the academic year.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}