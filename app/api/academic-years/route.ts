// app/api/academic-years/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const years = await prisma.academicYear.findMany({ orderBy: { startDate: "desc" } });
  return NextResponse.json(years);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { label, startDate, endDate } = body;

  if (!label || !startDate || !endDate) {
    return NextResponse.json(
      { error: "label, startDate, and endDate are required" },
      { status: 400 }
    );
  }

  const year = await prisma.academicYear.create({
    data: { label, startDate: new Date(startDate), endDate: new Date(endDate) },
  });

  return NextResponse.json(year, { status: 201 });
}