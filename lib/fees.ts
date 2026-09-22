// lib/fees.ts
// Shared, pure helpers for the fee system.
// No database or server imports here, so this file is safe to use from
// both API routes and client pages.

export type FeeTypeName =
  | "TUITION"
  | "HOSTEL"
  | "TRANSPORT"
  | "ADMISSION"
  | "ANNUAL"
  | "PREVIOUS_DUES"
  | "OTHER";

// HOSTEL is stored in the database under the name HOSTEL, but it is the
// hostel/mess charge from the school's fee sheet.
export const FEE_TYPE_LABELS: Record<FeeTypeName, string> = {
  TUITION: "Tuition",
  HOSTEL: "Hostel / Mess",
  TRANSPORT: "Transport",
  ADMISSION: "Admission",
  ANNUAL: "Annual (Library, Sports, Exam & Activity)",
  PREVIOUS_DUES: "Previous dues",
  OTHER: "Other",
};

export type YearMonth = { month: number; year: number }; // month is 1-12

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function monthLabel(m: YearMonth): string {
  return `${MONTH_SHORT[m.month - 1] ?? "?"} ${m.year}`;
}

export function monthKey(m: YearMonth): string {
  return `${m.year}-${m.month}`;
}

// -1 if a is earlier than b, 0 if same month, 1 if later.
export function compareYearMonth(a: YearMonth, b: YearMonth): number {
  if (a.year !== b.year) return a.year < b.year ? -1 : 1;
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  return 0;
}

// Every month from the start date to the end date of an academic year,
// e.g. Apr 2026 ... Mar 2027. Uses UTC so the result never shifts by timezone.
export function monthsInRange(start: Date | string, end: Date | string): YearMonth[] {
  const s = new Date(start);
  const e = new Date(end);
  const result: YearMonth[] = [];

  let month = s.getUTCMonth() + 1;
  let year = s.getUTCFullYear();
  const endMonth = e.getUTCMonth() + 1;
  const endYear = e.getUTCFullYear();

  // The counter is a safety net so a bad date can never loop forever.
  for (let i = 0; i < 24; i++) {
    result.push({ month, year });
    if (year === endYear && month === endMonth) break;
    if (year > endYear || (year === endYear && month > endMonth)) break;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return result;
}

// The month in which one-time fees (Annual, Admission) are recorded:
// the first month of the academic year.
export function firstMonthOfYear(start: Date | string): YearMonth {
  const s = new Date(start);
  return { month: s.getUTCMonth() + 1, year: s.getUTCFullYear() };
}

export function formatRupees(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}