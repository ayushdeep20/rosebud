// app/api/admin/fees/dues/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Remove line 4: import { DEFAULT_FEE_MATRIX } from "../structure/route";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
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
    orderBy: [{ year: "asc" }, { month: "asc" }],
    include: {
      allocations: {
        include: { payment: true },
      },
    },
  });

  return NextResponse.json({ success: true, data: dues });
}