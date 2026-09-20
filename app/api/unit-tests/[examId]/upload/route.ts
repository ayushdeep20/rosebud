import { NextRequest, NextResponse } from "next/server";
import * as xlsx from "xlsx";
// import prisma from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const examId = params.id;
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = xlsx.read(Buffer.from(arrayBuffer), { type: "buffer" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(worksheet);

    const invalidRows: { rowNumber: number; reason: string }[] = [];
    let savedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row: any = rows[i];
      const actualRowNumber = i + 2; 

      const rawMark = row["Marks"];
      let numericMark: number | null = null;
      let isAbsent = false;

      // 1. STRENGTHENED BLANK CHECK: Still block accidental empty cells
      if (rawMark === undefined || rawMark === null || rawMark === "") {
        invalidRows.push({
          rowNumber: actualRowNumber,
          reason: "Marks are missing. Enter a number or 'A' for absent.",
        });
        continue;
      }

      // 2. THE ABSENTEE CHECK: Did the teacher type "A" or "Absent"?
      const stringMark = String(rawMark).trim().toUpperCase();
      if (stringMark === "A" || stringMark === "ABSENT") {
        isAbsent = true;
        numericMark = null; // No marks are awarded
      } else {
        // 3. THE NUMBER CHECK: If not absent, it MUST be a valid number
        numericMark = Number(rawMark);
        if (isNaN(numericMark)) {
          invalidRows.push({
            rowNumber: actualRowNumber,
            reason: "Marks must be a valid number or 'A' (Absent)",
          });
          continue;
        }
      }

      // 4. THE UPSERT LOGIC (Saves marks OR the absent flag, overwriting previous mistakes)
      /*
      await prisma.unitTestMark.upsert({
        where: {
          studentId_unitTestId: {
            studentId: row["Student ID"], 
            unitTestId: examId,
          }
        },
        update: { 
          marks: numericMark,
          isAbsent: isAbsent 
        },
        create: {
          studentId: row["Student ID"],
          unitTestId: examId,
          marks: numericMark,
          isAbsent: isAbsent
        }
      });
      */
      
      savedCount++;
    }

    if (savedCount === 0) {
      return NextResponse.json(
        { 
          error: "No data was saved. Ensure the 'Marks' column contains numbers or 'A'.",
          invalidRows 
        },
        { status: 422 }
      );
    }

    if (invalidRows.length > 0) {
      return NextResponse.json(
        { 
          error: `Saved ${savedCount} rows, but ${invalidRows.length} rows had errors.`,
          invalidRows 
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ saved: savedCount }, { status: 200 });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error while processing." },
      { status: 500 }
    );
  }
}