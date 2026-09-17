// lib/studentImport.ts
import * as XLSX from "xlsx";

export function normalizeClassName(name: string): string {
  return name.trim().toLowerCase().replace(/^class\s+/, "");
}

export function normalizeSectionName(name: string): string {
  return name.trim().toUpperCase();
}

export type ImportRow = {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  admissionNumber?: string;
  className?: string;
  sectionName?: string;
  rollNumber?: string;
  aadhaarNumber?: string;
};

export type ValidatedRow = {
  rowNumber: number;
  data: ImportRow;
  status: "valid" | "invalid";
  reasons: string[];
  sectionId?: string;
};

export function parseSpreadsheet(buffer: ArrayBuffer): ImportRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  return rows.map((row) => ({
    firstName: String(row.firstName ?? "").trim(),
    lastName: String(row.lastName ?? "").trim(),
    dateOfBirth: String(row.dateOfBirth ?? "").trim(),
    gender: String(row.gender ?? "").trim(),
    admissionNumber: String(row.admissionNumber ?? "").trim(),
    className: String(row.className ?? "").trim(),
    sectionName: String(row.sectionName ?? "").trim(),
    rollNumber: String(row.rollNumber ?? "").trim(),
    aadhaarNumber: String(row.aadhaarNumber ?? "").trim(),
  }));
}

export function validateRows(
  rows: ImportRow[],
  sectionLookup: Map<string, { id: string }>,
  existingAdmissionNumbers: Set<string>
): ValidatedRow[] {
  const seenInFile = new Set<string>();

  return rows.map((data, index) => {
    const reasons: string[] = [];
    const rowNumber = index + 2;

    if (!data.firstName) reasons.push("Missing first name");
    if (!data.lastName) reasons.push("Missing last name");
    if (!data.dateOfBirth || isNaN(Date.parse(data.dateOfBirth))) {
      reasons.push("Missing or invalid date of birth (use YYYY-MM-DD)");
    }
    if (!data.admissionNumber) {
      reasons.push("Missing admission number");
    } else if (existingAdmissionNumbers.has(data.admissionNumber)) {
      reasons.push("Admission number already exists in the system");
    } else if (seenInFile.has(data.admissionNumber)) {
      reasons.push("Duplicate admission number within this file");
    }

    let sectionId: string | undefined;
    const key = `${normalizeClassName(data.className ?? "")}|${normalizeSectionName(
      data.sectionName ?? ""
    )}`;
    const match = sectionLookup.get(key);
    if (!data.className || !data.sectionName) {
      reasons.push("Missing class or section");
    } else if (!match) {
      reasons.push(
        `No matching Class "${data.className}" / Section "${data.sectionName}" found — create it in Admin first`
      );
    } else {
      sectionId = match.id;
    }

    if (data.admissionNumber) seenInFile.add(data.admissionNumber);

    return {
      rowNumber,
      data,
      status: reasons.length === 0 ? "valid" : "invalid",
      reasons,
      sectionId,
    };
  });
}