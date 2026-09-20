// app/api/exams/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const exams = await prisma.exam.findMany({
    where: { type: { in: ["HALF_YEARLY", "ANNUAL"] } },
    include: {
      academicYear: true,
      section: { include: { schoolClass: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  type ExamGroup = {
    type: string;
    name: string;
    academicYearLabel: string;
    schoolClassName: string;
    sectionCount: number;
  };

  const grouped = new Map<string, ExamGroup>();

  for (const exam of exams) {
    const key = `${exam.type}|${exam.academicYearId}|${exam.section.schoolClassId}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.sectionCount += 1;
    } else {
      grouped.set(key, {
        type: exam.type,
        name: exam.name,
        academicYearLabel: exam.academicYear.label,
        schoolClassName: exam.section.schoolClass.name,
        sectionCount: 1,
      });
    }
  }

  return NextResponse.json(Array.from(grouped.values()));
}

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { type, academicYearId, schoolClassId } = body;

  if (!type || !academicYearId || !schoolClassId) {
    return NextResponse.json(
      { error: "type, academicYearId, and schoolClassId are required" },
      { status: 400 }
    );
  }

  if (type !== "HALF_YEARLY" && type !== "ANNUAL") {
    return NextResponse.json(
      { error: "type must be HALF_YEARLY or ANNUAL" },
      { status: 400 }
    );
  }

  const sections = await prisma.section.findMany({
    where: { schoolClassId },
  });

  if (sections.length === 0) {
    return NextResponse.json(
      { error: "This class has no sections yet — add a section first." },
      { status: 400 }
    );
  }

  const name =
    type === "HALF_YEARLY" ? "Half Yearly Examination" : "Annual Examination";

  const existing = await prisma.exam.findMany({
    where: {
      type,
      academicYearId,
      sectionId: { in: sections.map((s) => s.id) },
    },
  });
  const existingSectionIds = new Set(existing.map((e) => e.sectionId));
  const sectionsToCreate = sections.filter(
    (s) => !existingSectionIds.has(s.id)
  );

  if (sectionsToCreate.length === 0) {
    return NextResponse.json(
      { error: "This exam already exists for every section of this class." },
      { status: 409 }
    );
  }

  await prisma.exam.createMany({
    data: sectionsToCreate.map((s) => ({
      name,
      type,
      academicYearId,
      sectionId: s.id,
      createdById: session.user.id,
    })),
  });

  return NextResponse.json(
    { created: sectionsToCreate.length },
    { status: 201 }
  );
}