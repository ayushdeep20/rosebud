import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const year = await prisma.academicYear.findUnique({ where: { id } });
  if (!year) {
    return NextResponse.json({ error: "Academic year not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.academicYear.updateMany({
      where: { isCurrent: true },
      data: { isCurrent: false },
    }),
    prisma.academicYear.update({
      where: { id },
      data: { isCurrent: true },
    }),
  ]);

  return NextResponse.json({ success: true });
}