import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const academicYearId = formData.get("academicYearId") as string;

    if (!file || !academicYearId) {
      return NextResponse.json({ error: "Missing file or academicYearId." }, { status: 400 });
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // To ensure zero dependency issues with npm install on Windows, 
    // we can parse CSV or tab-delimited text exports which Excel generates perfectly.
    // Or if teachers upload .xlsx, we can accept both CSV text and text-based uploads.
    const textContent = buffer.toString("utf8");
    const lines = textContent.split(/\r?\n/);

    let importedCount = 0;
    let skippedCount = 0;

    for (const line of lines) {
      if (!line.trim()) continue;
      
      // Parse columns separated by comma or tab
      const cols = line.split(/,|\t/).map(c => c.replace(/^"|"$/g, "").trim());
      if (cols.length < 2) continue;

      // Identify admission number and dues
      // If first column is numeric or matches admission format
      const admNo = cols[0];
      const dues = parseFloat(cols[cols.length - 2]?.replace(/,/g, "") || cols[1]?.replace(/,/g, ""));

      if (!admNo || isNaN(dues) || dues <= 0 || admNo.toLowerCase().includes("adm")) continue;

      const student = await prisma.student.findUnique({
        where: { admissionNumber: admNo },
      });

      if (!student) {
        skippedCount++;
        continue;
      }

      const existingOpening = await prisma.feeDue.findFirst({
        where: {
          studentId: student.id,
          academicYearId,
          month: 0,
        },
      });

      if (existingOpening) {
        await prisma.feeDue.update({
          where: { id: existingOpening.id },
          data: { amountDue: dues },
        });
      } else {
        await prisma.feeDue.create({
          data: {
            studentId: student.id,
            academicYearId,
            feeType: "TUITION",
            month: 0,
            year: 2026,
            amountDue: dues,
            amountPaid: 0,
            status: "PENDING",
          },
        });
      }

      importedCount++;
    }

    return NextResponse.json({
      success: true,
      importedCount,
      skippedCount,
      message: `Successfully imported opening balances for ${importedCount} students. Skipped ${skippedCount} unmatched admission numbers.`,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Internal server error during import." }, { status: 500 });
  }
}