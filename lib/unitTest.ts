// lib/unitTest.ts
import * as XLSX from "xlsx";

export type MarksRow = {
  rollNumber?: string;
  name?: string;
  marks?: string;
};

export type ValidatedMarksRow = {
  rowNumber: number;
  rollNumber: number | null;
  marks: number | null;
  status: "valid" | "invalid";
  reason?: string;
  studentId?: string;
};

export function buildUnitTestTemplate(
  students: { rollNumber: number | null; name: string }[]
): Buffer {
  const data = students.map((s) => ({
    "Roll No": s.rollNumber ?? "",
    Name: s.name,
    Marks: "",
  }));

  const sheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Marks");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

export function parseMarksSheet(buffer: ArrayBuffer): MarksRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  return rows.map((row) => ({
    rollNumber: String(row["Roll No"] ?? "").trim(),
    name: String(row["Name"] ?? "").trim(),
    marks: String(row["Marks"] ?? "").trim(),
  }));
}

export function validateMarksRows(
  rows: MarksRow[],
  rollToStudent: Map<number, { id: string; name: string }>,
  totalMarks: number
): ValidatedMarksRow[] {
  return rows.map((row, index) => {
    const rowNumber = index + 2; // header row + 1-based

    const rollNumber = row.rollNumber ? Number(row.rollNumber) : null;
    if (!rollNumber || isNaN(rollNumber)) {
      return {
        rowNumber,
        rollNumber: null,
        marks: null,
        status: "invalid",
        reason: "Missing or invalid Roll No",
      };
    }

    const student = rollToStudent.get(rollNumber);
    if (!student) {
      return {
        rowNumber,
        rollNumber,
        marks: null,
        status: "invalid",
        reason: `No student with Roll No ${rollNumber} in this section`,
      };
    }

    if (row.marks === "" || row.marks === undefined) {
      return {
        rowNumber,
        rollNumber,
        marks: null,
        status: "invalid",
        reason: `Missing Marks for ${student.name}`,
        studentId: student.id,
      };
    }

    const marks = Number(row.marks);
    if (isNaN(marks) || marks < 0) {
      return {
        rowNumber,
        rollNumber,
        marks: null,
        status: "invalid",
        reason: `Marks must be a number ≥ 0 (got "${row.marks}")`,
        studentId: student.id,
      };
    }

    if (marks > totalMarks) {
      return {
        rowNumber,
        rollNumber,
        marks,
        status: "invalid",
        reason: `Marks (${marks}) exceed Total Marks (${totalMarks})`,
        studentId: student.id,
      };
    }

    return {
      rowNumber,
      rollNumber,
      marks,
      status: "valid",
      studentId: student.id,
    };
  });
}