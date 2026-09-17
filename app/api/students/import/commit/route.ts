// app/api/students/import/commit/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateStudentId } from "@/lib/studentId";
import type { ImportRow } from "@/lib/studentImport";

type CommitRow = {
  rowNumber: number;
  data: ImportRow;
  sectionId: string;
};

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { academicYearId, rows } = body as {
    academicYearId: string;
    rows: CommitRow[];
  };

  if (!academicYearId || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json(
      { error: "academicYearId and at least one row are required" },
      { status: 400 }
    );
  }

  const academicYear = await prisma.academicYear.findUnique({
    where: { id: academicYearId },
  });
  if (!academicYear) {
    return NextResponse.json(
      { error: "Academic year not found" },
      { status: 404 }
    );
  }

  const results: {
    rowNumber: number;
    status: "created" | "failed";
    studentCode?: string;
    username?: string;
    tempPassword?: string;
    error?: string;
  }[] = [];

  // Each row gets its own transaction, so one bad row can never
  // roll back students that were already successfully created.
  for (const row of rows) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const studentCode = await generateStudentId(tx, academicYear.label);
        const username = studentCode.replace(/-/g, "").toLowerCase();
        const tempPassword = `${row.data.lastName}@${row.data.admissionNumber}`.slice(
          0,
          20
        );
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        const user = await tx.user.create({
          data: {
            username,
            passwordHash,
            role: "STUDENT",
            mustChangePassword: true,
          },
        });

        const student = await tx.student.create({
          data: {
            studentCode,
            admissionNumber: row.data.admissionNumber!,
            firstName: row.data.firstName!,
            lastName: row.data.lastName!,
            dateOfBirth: new Date(row.data.dateOfBirth!),
            gender: row.data.gender || null,
            userId: user.id,
          },
        });

        await tx.enrollment.create({
          data: {
            studentId: student.id,
            sectionId: row.sectionId,
            academicYearId,
            rollNumber: row.data.rollNumber
              ? Number(row.data.rollNumber)
              : null,
          },
        });

        return { studentCode, username, tempPassword };
      });

      results.push({
        rowNumber: row.rowNumber,
        status: "created",
        ...result,
      });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      results.push({
        rowNumber: row.rowNumber,
        status: "failed",
        error:
          code === "P2002"
            ? "Duplicate admission number"
            : "Failed to create this student",
      });
    }
  }

  return NextResponse.json({ results });
}