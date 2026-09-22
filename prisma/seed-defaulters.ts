import { PrismaClient, FeeType, FeeStatus, Role } from "@prisma/client";
import * as XLSX from "xlsx";
import * as path from "path";

const prisma = new PrismaClient();

interface DefaulterRow {
  "Adm. No.": string | number;
  Name: string;
  Class: string;
  Roll: string | number;
  Dues: number;
  Address?: string;
}

// Helper to map class names to a sortable order number
function getClassOrder(className: string): number {
  const normalized = className.trim().toUpperCase();
  const orderMap: Record<string, number> = {
    "NURSERY": 1, "LKG": 2, "UKG": 3,
    "I": 4, "II": 5, "III": 6, "IV": 7, "V": 8, "VI": 9,
    "VII": 10, "VIII": 11, "IX": 12, "X": 13, "XI": 14, "XII": 15
  };
  return orderMap[normalized] || 20;
}

async function seedWholeSchoolDefaulters() {
  console.log("🚀 Starting Whole-School Defaulters Sync for All Classes...\n");

  try {
    // 1. Ensure Active Academic Year exists
    const academicYear = await prisma.academicYear.upsert({
      where: { label: "2026-2027" },
      update: { isCurrent: true },
      create: {
        label: "2026-2027",
        startDate: new Date("2026-04-01"),
        endDate: new Date("2027-03-31"),
        isCurrent: true,
      },
    });

    // 2. Read spreadsheet from project root
    const filePath = path.join(process.cwd(), "defaulters_list.xlsx");
    const workbook = XLSX.readFile(filePath);
    
    // Process all sheets or default to the first sheet if it contains all classes
    const sheetName = workbook.SheetNames[0];
    const rawData: DefaulterRow[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Filter out summary/total rows or empty admission numbers
    const studentRows = rawData.filter((row) => {
      const adm = row["Adm. No."];
      if (!adm) return false;
      const admStr = String(adm).trim().toLowerCase();
      return !admStr.includes("total") && !admStr.includes("sum");
    });

    console.log(`📊 Found ${studentRows.length} total student records across the school.\n`);

    let successCount = 0;

    for (const row of studentRows) {
      const admNo = String(row["Adm. No."]).trim();
      const rawName = String(row.Name || "").trim();
      const rawClassStr = String(row.Class || "").trim();
      const dueAmount = Number(row.Dues || 0);

      if (!rawName || !rawClassStr) {
        console.warn(`⚠️ Skipping row with missing Name or Class (Adm. No: ${admNo})`);
        continue;
      }

      // Split name into First and Last name
      const nameParts = rawName.split(" ");
      const firstName = nameParts[0] || "Student";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Dynamically split Class and Section (e.g., "VII-A" -> Class: "VII", Section: "A")
      // Also handles formats like "VII A", "VIIIE", etc.
      let normalizedClassName = rawClassStr;
      let normalizedSectionName = "A";

      if (rawClassStr.includes("-")) {
        const parts = rawClassStr.split("-");
        normalizedClassName = parts[0].trim();
        normalizedSectionName = parts[1].trim() || "A";
      } else {
        // Match trailing letters if formatted like "VIIA" or "VII A"
        const match = rawClassStr.match(/^(.+?)\s*([A-Za-z])$/);
        if (match) {
          normalizedClassName = match[1].trim();
          normalizedSectionName = match[2].trim();
        }
      }

      // 3. Upsert Class with correct chronological order
      const schoolClass = await prisma.schoolClass.upsert({
        where: { name: normalizedClassName },
        update: {},
        create: {
          name: normalizedClassName,
          order: getClassOrder(normalizedClassName),
        },
      });

      // 4. Upsert Section
      const section = await prisma.section.upsert({
        where: {
          schoolClassId_name: {
            schoolClassId: schoolClass.id,
            name: normalizedSectionName,
          },
        },
        update: {},
        create: {
          name: normalizedSectionName,
          schoolClassId: schoolClass.id,
        },
      });

      // 5. Upsert User Account for Student
      const username = `stu_${admNo}`;
      const user = await prisma.user.upsert({
        where: { username },
        update: {},
        create: {
          username,
          passwordHash: "$2b$10$e8p1aJ7Z1w...", // Default secure hash
          role: Role.STUDENT,
          mustChangePassword: true,
        },
      });

      // 6. Upsert Student Profile
      const student = await prisma.student.upsert({
        where: { admissionNumber: admNo },
        update: {
          address: row.Address ? String(row.Address).trim() : null,
        },
        create: {
          admissionNumber: admNo,
          studentCode: `STU-${admNo}`,
          firstName,
          lastName,
          dateOfBirth: new Date("2012-01-01"),
          address: row.Address ? String(row.Address).trim() : null,
          userId: user.id,
        },
      });

      // 7. Upsert Enrollment (Class/Section assignment for the year)
      await prisma.enrollment.upsert({
        where: {
          studentId_academicYearId: {
            studentId: student.id,
            academicYearId: academicYear.id,
          },
        },
        update: { sectionId: section.id },
        create: {
          studentId: student.id,
          academicYearId: academicYear.id,
          sectionId: section.id,
          rollNumber: Number(row.Roll) || null,
        },
      });

      // 8. Seed Outstanding Dues into FeeDue table
      if (dueAmount > 0) {
        await prisma.feeDue.upsert({
          where: {
            studentId_academicYearId_feeType_month_year: {
              studentId: student.id,
              academicYearId: academicYear.id,
              feeType: FeeType.PREVIOUS_DUES,
              month: 4, // April billing cycle
              year: 2026,
            },
          },
          update: { amountDue: dueAmount },
          create: {
            studentId: student.id,
            academicYearId: academicYear.id,
            feeType: FeeType.PREVIOUS_DUES,
            month: 4,
            year: 2026,
            amountDue: dueAmount,
            amountPaid: 0,
            status: FeeStatus.PENDING,
            description: "Carried Forward Outstanding Dues",
          },
        });
      }

      successCount++;
      console.log(`[${successCount}/${studentRows.length}] Synced: ${firstName} ${lastName} (Adm: ${admNo}) | Class: ${normalizedClassName}-${normalizedSectionName} | Dues: ₹${dueAmount}`);
    }

    console.log(`\n🎉 Whole-School Sync Completed Successfully! Total Processed: ${successCount} students.`);
  } catch (error) {
    console.error("❌ Import Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedWholeSchoolDefaulters();