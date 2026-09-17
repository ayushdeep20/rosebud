// lib/studentId.ts
import { Prisma } from "@prisma/client";

export async function generateStudentId(
  tx: Prisma.TransactionClient,
  academicYearLabel: string
): Promise<string> {
  const yearPrefix = academicYearLabel.slice(0, 4); // "2026-27" -> "2026"
  const key = `student-${yearPrefix}`;

  // A single atomic UPDATE/INSERT — safe even if two admins create
  // students in the same instant, because Postgres locks this row
  // during the operation.
  const counter = await tx.idCounter.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });

  const sequence = String(counter.value).padStart(4, "0");
  return `RBS-${yearPrefix}-${sequence}`;
}