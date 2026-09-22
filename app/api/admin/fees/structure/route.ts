// app/api/admin/fees/structure/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Export default fee amounts used when fallback rates are needed
export const DEFAULT_FEE_MATRIX = [
  { feeType: "TUITION", amount: 1900, isBoarder: false },
  { feeType: "TUITION", amount: 2500, isBoarder: true },
  { feeType: "TRANSPORT", amount: 900, isBoarder: false },
  { feeType: "HOSTEL", amount: 3500, isBoarder: true },
  { feeType: "ADMISSION", amount: 5000, isBoarder: false },
  { feeType: "ANNUAL", amount: 2000, isBoarder: false },
] as const;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const academicYearId = searchParams.get("academicYearId");

  if (!academicYearId) {
    return NextResponse.json({ error: "academicYearId param required" }, { status: 400 });
  }

  const structures = await prisma.feeStructure.findMany({
    where: { academicYearId },
    include: { schoolClass: true },
  });

  return NextResponse.json({ success: true, data: structures });
}

export async function POST(req: Request) {
  try {
    const { academicYearId, schoolClassId, isBoarder, feeType, amount } = await req.json();

    const structure = await prisma.feeStructure.upsert({
      where: {
        academicYearId_schoolClassId_isBoarder_feeType: {
          academicYearId,
          schoolClassId,
          isBoarder: Boolean(isBoarder),
          feeType,
        },
      },
      update: { amount: Number(amount) },
      create: {
        academicYearId,
        schoolClassId,
        isBoarder: Boolean(isBoarder),
        feeType,
        amount: Number(amount),
      },
    });

    return NextResponse.json({ success: true, data: structure });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}