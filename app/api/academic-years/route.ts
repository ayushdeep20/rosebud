// app/api/academic-years/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const academicYears = await prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
    });
    return NextResponse.json({ academicYears });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch academic years" }, { status: 500 });
  }
}