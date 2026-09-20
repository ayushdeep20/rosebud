import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const sectionId = searchParams.get("sectionId");
  const dateParam = searchParams.get("date");

  if (!sectionId || !dateParam) {
    return NextResponse.json({ error: "sectionId and date are required" }, { status: 400 });
  }

  const date = new Date(dateParam);

  const records = await prisma.attendance.findMany({
    where: { sectionId, date },
    include: {
      student: true,
      markedBy: { select: { username: true } },
    },
    orderBy: { student: { firstName: "asc" } },
  });

  const summary = {
    present: records.filter((r) => r.status === "PRESENT").length,
    absent: records.filter((r) => r.status === "ABSENT").length,
    late: records.filter((r) => r.status === "LATE").length,
    leave: records.filter((r) => r.status === "LEAVE").length,
    total: records.length,
  };

  return NextResponse.json({ records, summary });
}