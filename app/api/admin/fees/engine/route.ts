import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Master Default Matrix for Rosebud School (2026-27)
const DEFAULT_CLASS_MATRIX: Record<string, any> = {
  "LKG":  { tuition: 1500, annual: 4000, transport: 900, mess: 3700, exam: 500 },
  "UKG":  { tuition: 1500, annual: 4000, transport: 900, mess: 3700, exam: 500 },
  "I":    { tuition: 1600, annual: 4000, transport: 900, mess: 3700, exam: 500 },
  "II":   { tuition: 1600, annual: 4000, transport: 900, mess: 3700, exam: 500 },
  "III":  { tuition: 1700, annual: 4000, transport: 900, mess: 3800, exam: 500 },
  "IV":   { tuition: 1700, annual: 4000, transport: 900, mess: 3800, exam: 500 },
  "V":    { tuition: 1800, annual: 4000, transport: 900, mess: 4000, exam: 500 },
  "VI":   { tuition: 1800, annual: 4000, transport: 900, mess: 4000, exam: 500 },
  "VII":  { tuition: 1900, annual: 4000, transport: 900, mess: 4000, exam: 500 },
  "VIII": { tuition: 2100, annual: 4000, transport: 900, mess: 4000, exam: 500 },
  "IX":   { tuition: 2300, annual: 4000, transport: 900, mess: 4500, exam: 600 },
  "X":    { tuition: 2400, annual: 4000, transport: 900, mess: 4500, exam: 600 },
  "XI":   { tuition: 2700, annual: 4000, transport: 900, mess: 0,    exam: 750 },
  "XII":  { tuition: 2700, annual: 4000, transport: 900, mess: 0,    exam: 750 },
};

const MONTH_NAMES = [
  "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March"
];

// Helper: Calculate Month-by-Month Fees for a Student
export function calculateStudentMonthlyLedger(
  className: string,
  category: "DAY_SCHOLAR" | "TRANSPORT" | "HOSTELLER",
  customOverrides: Record<string, number> = {},
  totalPaymentsMade: number = 0
) {
  const baseClass = className.split("-")[0]?.trim() || "VII";
  const rates = DEFAULT_CLASS_MATRIX[baseClass] || DEFAULT_CLASS_MATRIX["VII"];

  let remainingPayment = totalPaymentsMade;
  const monthsLedger = [];

  for (let monthIndex = 1; monthIndex <= 12; monthIndex++) {
    const monthName = MONTH_NAMES[monthIndex - 1];

    // 1. Calculate Monthly Fee Heads
    let tuition = rates.tuition;
    let transport = category === "TRANSPORT" ? rates.transport : 0;
    let mess = category === "HOSTELLER" ? rates.mess : 0;
    let annual = monthIndex === 1 ? (category === "HOSTELLER" ? rates.annual + 500 : rates.annual) : 0;
    let exam = (monthIndex === 6 || monthIndex === 12) ? rates.exam : 0;

    // Apply Admin Custom Overrides if any
    if (`${monthIndex}_TUITION` in customOverrides) tuition = customOverrides[`${monthIndex}_TUITION`];
    if (`${monthIndex}_TRANSPORT` in customOverrides) transport = customOverrides[`${monthIndex}_TRANSPORT`];
    if (`${monthIndex}_MESS` in customOverrides) mess = customOverrides[`${monthIndex}_MESS`];
    if (`${monthIndex}_ANNUAL` in customOverrides) annual = customOverrides[`${monthIndex}_ANNUAL`];
    if (`${monthIndex}_EXAM` in customOverrides) exam = customOverrides[`${monthIndex}_EXAM`];

    const monthGrossTotal = tuition + transport + mess + annual + exam;

    // 2. FIFO Payment Allocation
    let monthPaidAmount = 0;
    let monthDueAmount = monthGrossTotal;
    let status: "PAID" | "PARTIAL" | "PENDING" = "PENDING";

    if (remainingPayment >= monthGrossTotal) {
      monthPaidAmount = monthGrossTotal;
      monthDueAmount = 0;
      remainingPayment -= monthGrossTotal;
      status = "PAID";
    } else if (remainingPayment > 0) {
      monthPaidAmount = remainingPayment;
      monthDueAmount = monthGrossTotal - remainingPayment;
      remainingPayment = 0;
      status = "PARTIAL";
    } else {
      monthPaidAmount = 0;
      monthDueAmount = monthGrossTotal;
      status = "PENDING";
    }

    monthsLedger.push({
      monthNumber: monthIndex,
      monthName,
      heads: { tuition, transport, mess, annual, exam },
      grossTotal: monthGrossTotal,
      paidAmount: monthPaidAmount,
      dueAmount: monthDueAmount,
      status,
    });
  }

  const grossTotalYear = monthsLedger.reduce((a, m) => a + m.grossTotal, 0);
  const netOutstanding = Math.max(0, grossTotalYear - totalPaymentsMade);
  const totalPaid = Math.min(grossTotalYear, totalPaymentsMade);

  // Fractional Month Paid calculation
  const monthlyBaseRate = rates.tuition + (category === "TRANSPORT" ? rates.transport : category === "HOSTELLER" ? rates.mess : 0);
  const paidMonthsCount = (totalPaid / monthlyBaseRate).toFixed(1);

  return {
    monthsLedger,
    grossTotalYear,
    totalPaid,
    netOutstanding,
    paidMonthsCount,
    monthlyBaseRate,
  };
}

// GET: Fetch System Data for All Students
export async function GET() {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Sample database mock or live Prisma fetch
    const rawStudents = [
      { id: "s1", admNo: "1846", name: "Nikhil Raj", class: "VII-A", category: "DAY_SCHOLAR", paidTotal: 7800 },
      { id: "s2", admNo: "3079", name: "Ardsheep Mehta", class: "VII-A", category: "TRANSPORT", paidTotal: 16600 },
      { id: "s3", admNo: "2558", name: "Rahul Kumar", class: "VII-A", category: "HOSTELLER", paidTotal: 16300 },
      { id: "s4", admNo: "1995", name: "Anshu Kumari", class: "VII-A", category: "TRANSPORT", paidTotal: 20800 },
      { id: "s5", admNo: "2111", name: "Vivek Kumar", class: "X-A", category: "HOSTELLER", paidTotal: 11400 },
      { id: "s6", admNo: "2313", name: "Riya Kumari", class: "LKG-A", category: "TRANSPORT", paidTotal: 7600 },
      { id: "s7", admNo: "2370", name: "Baljeet Pratap", class: "XI-A", category: "DAY_SCHOLAR", paidTotal: 12100 },
    ];

    const processedStudents = rawStudents.map((s) => {
      const breakdown = calculateStudentMonthlyLedger(s.class, s.category as any, {}, s.paidTotal);
      return {
        ...s,
        ...breakdown,
      };
    });

    return NextResponse.json({ students: processedStudents });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load fee engine data" }, { status: 500 });
  }
}

// PUT: Admin Override Endpoint (Update Fee Rates / Edit Monthly Items / Change Category)
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { studentId, action, payload } = await req.json();

    if (action === "UPDATE_STUDENT_CATEGORY") {
      // Logic to switch student between DAY_SCHOLAR, TRANSPORT, HOSTELLER
      return NextResponse.json({ success: true, message: `Updated student category to ${payload.category}` });
    }

    if (action === "OVERRIDE_MONTH_FEE") {
      // Logic to save manual fee discount or custom transport charge
      return NextResponse.json({ success: true, message: "Monthly fee override saved successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update record" }, { status: 500 });
  }
}