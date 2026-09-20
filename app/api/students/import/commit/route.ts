// app/api/students/import/commit/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { createStudentInTx } from "@/lib/students/service";
import { recordAudit } from "@/lib/audit";
import type { ImportRow } from "@/lib/studentImport";

type CommitRow = {
  rowNumber: number;
  data: ImportRow;
  sectionId: string;
};

export async function POST(request: Request) {
  const session = await auth();
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const actorUserId = session.user.id;

  const body = await request.json();
  const { academicYearId, rows } = body as { academicYearId: string; rows: CommitRow[] };

  if (!academicYearId || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json(
      { error: "academicYearId and at least one row are required" },
      { status: 400 }
    );
  }

  const academicYear = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
  if (!academicYear) {
    return NextResponse.json({ error: "Academic year not found" }, { status: 404 });
  }

  const results: {
    rowNumber: number;
    status: "created" | "failed";
    studentCode?: string;
    username?: string;
    tempPassword?: string;
    error?: string;
  }[] = [];

  for (const row of rows) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const created = await createStudentInTx(
          tx,
          {
            firstName: row.data.firstName!,
            lastName: row.data.lastName!,
            dateOfBirth: row.data.dateOfBirth!,
            admissionNumber: row.data.admissionNumber!,
            gender: row.data.gender,
            academicYearId,
            sectionId: row.sectionId,
            rollNumber: row.data.rollNumber,
            aadhaarNumber: row.data.aadhaarNumber,
          },
          academicYear.label
        );

        await recordAudit(tx, {
          actorUserId,
          action: "STUDENT_IMPORT",
          entityType: "Student",
          entityId: created.studentId,
          after: { studentCode: created.studentCode, admissionNumber: row.data.admissionNumber },
        });

        return created;
      });

      results.push({ rowNumber: row.rowNumber, status: "created", ...result });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      results.push({
        rowNumber: row.rowNumber,
        status: "failed",
        error: code === "P2002" ? "Duplicate admission number" : "Failed to create this student",
      });
    }
  }

  return NextResponse.json({ results });
}