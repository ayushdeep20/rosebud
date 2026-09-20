// scripts/import-defaulters.ts
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  // Load the defaulters file
  const filePath = path.join(process.cwd(), "scripts", "defaulters_list.xlsx");
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<{
    "Adm. No.": number;
    Name: string;
    Class: string;
    Roll: number;
    Dues: number;
  }>(sheet);

  console.log(`Found ${rows.length} defaulter records`);

  // Get the 2026-27 academic year
  const academicYear = await prisma.academicYear.findFirst({
    where: { label: "2026-27" },
  });

  if (!academicYear) {
    console.error("Academic year 2026-27 not found. Create it first.");
    return;
  }

  console.log(`Using academic year: ${academicYear.label} (${academicYear.id})`);

  let imported = 0;
  let skipped = 0;
  const skippedNames: string[] = [];

  for (const row of rows) {
    const admissionNumber = String(row["Adm. No."]).trim();
    const dues = Number(row["Dues"]);

    if (!admissionNumber || isNaN(dues) || dues <= 0) continue;

    const student = await prisma.student.findUnique({
      where: { admissionNumber },
    });

    if (!student) {
      skipped++;
      skippedNames.push(`${row.Name} (Adm: ${admissionNumber})`);
      continue;
    }

    // Check if opening balance already exists
    const existing = await prisma.feeDue.findFirst({
      where: {
        studentId: student.id,
        academicYearId: academicYear.id,
        month: 0,
      },
    });

    if (existing) {
      await prisma.feeDue.update({
        where: { id: existing.id },
        data: { amountDue: dues },
      });
      console.log(`Updated: ${student.firstName} ${student.lastName} — ₹${dues}`);
    } else {
      await prisma.feeDue.create({
        data: {
          studentId: student.id,
          academicYearId: academicYear.id,
          feeType: "TUITION",
          month: 0,
          year: 2026,
          amountDue: dues,
          amountPaid: 0,
          status: "PENDING",
        },
      });
      console.log(`Imported: ${student.firstName} ${student.lastName} — ₹${dues}`);
    }

    imported++;
  }

  console.log(`\nDone. Imported: ${imported}, Skipped: ${skipped}`);
  if (skippedNames.length > 0) {
    console.log("Skipped (not found in database):");
    skippedNames.forEach((n) => console.log("  -", n));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());