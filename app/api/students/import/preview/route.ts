// app/api/students/import/preview/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  parseSpreadsheet,
  validateRows,
  normalizeClassName,
  normalizeSectionName,
} from "@/lib/studentImport";

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const rows = parseSpreadsheet(buffer);

  const sections = await prisma.section.findMany({
    include: { schoolClass: true },
  });
  const sectionLookup = new Map(
    sections.map((s) => [
      `${normalizeClassName(s.schoolClass.name)}|${normalizeSectionName(s.name)}`,
      { id: s.id },
    ])
  );

  const existingStudents = await prisma.student.findMany({
    select: { admissionNumber: true },
  });
  const existingAdmissionNumbers = new Set(
    existingStudents.map((s) => s.admissionNumber)
  );

  const validated = validateRows(rows, sectionLookup, existingAdmissionNumbers);

  const validCount = validated.filter((r) => r.status === "valid").length;

  return NextResponse.json({
    total: validated.length,
    validCount,
    invalidCount: validated.length - validCount,
    rows: validated,
  });
}