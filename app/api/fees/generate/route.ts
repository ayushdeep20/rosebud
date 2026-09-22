import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";
import {
  FEE_TYPE_LABELS,
  firstMonthOfYear,
  monthKey,
  monthLabel,
  monthsInRange,
  type FeeTypeName,
  type YearMonth,
} from "@/lib/fees";

type Body = {
  academicYearId?: string;
  classId?: string | null;
  months?: YearMonth[];
  includeOneTime?: boolean;
  dryRun?: boolean;
};

type Line = {
  studentId: string;
  feeType: FeeTypeName;
  month: number;
  year: number;
  amountDue: number;
};

type ClassStats = {
  className: string;
  order: number;
  students: number;
  boarders: number;
  busUsers: number;
  linesToCreate: number;
  amountToCreate: number;
};

const CHUNK_SIZE = 1000;

function isValidYearMonth(ym: unknown): ym is YearMonth {
  if (typeof ym !== "object" || ym === null) return false;
  const candidate = ym as Record<string, unknown>;
  return (
    typeof candidate.month === "number" &&
    candidate.month >= 1 &&
    candidate.month <= 12 &&
    typeof candidate.year === "number" &&
    candidate.year > 1900
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !requireAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const academicYearId = body.academicYearId;
  const classId = body.classId || null;
  const includeOneTime = body.includeOneTime === true;
  const dryRun = body.dryRun !== false;

  if (!academicYearId || typeof academicYearId !== "string") {
    return NextResponse.json({ error: "Please choose a valid academic year." }, { status: 400 });
  }

  const academicYear = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
  if (!academicYear) {
    return NextResponse.json({ error: "Academic year not found." }, { status: 404 });
  }

  // Validate and parse selected months
  const rawMonths = Array.isArray(body.months) ? body.months : [];
  for (const m of rawMonths) {
    if (!isValidYearMonth(m)) {
      return NextResponse.json(
        { error: "Invalid month specification provided." },
        { status: 400 }
      );
    }
  }

  const allowedMonths = monthsInRange(academicYear.startDate, academicYear.endDate);
  const allowedKeys = new Set(allowedMonths.map(monthKey));

  const selectedMonths: YearMonth[] = [];
  const seenMonths = new Set<string>();
  for (const m of rawMonths) {
    const key = monthKey(m);
    if (!allowedKeys.has(key)) {
      return NextResponse.json(
        { error: `${monthLabel(m)} is outside the academic year ${academicYear.label}.` },
        { status: 400 }
      );
    }
    if (!seenMonths.has(key)) {
      seenMonths.add(key);
      selectedMonths.push(m);
    }
  }

  if (selectedMonths.length === 0 && !includeOneTime) {
    return NextResponse.json(
      { error: "Select at least one month, or tick the one-time fees option." },
      { status: 400 }
    );
  }

  // Fetch rate structure
  const rateRows = await prisma.feeStructure.findMany({
    where: { academicYearId },
    select: { schoolClassId: true, isBoarder: true, feeType: true, amount: true },
  });

  if (rateRows.length === 0) {
    return NextResponse.json(
      { error: `No fee rates are set up for ${academicYear.label} yet.` },
      { status: 400 }
    );
  }

  const rates = new Map<string, number>();
  for (const r of rateRows) {
    rates.set(`${r.schoolClassId}|${r.isBoarder}|${r.feeType}`, r.amount);
  }

  // Fetch target student enrollments
  const enrollments = await prisma.enrollment.findMany({
    where: {
      academicYearId,
      ...(classId ? { section: { schoolClassId: classId } } : {}),
    },
    select: {
      isNewAdmission: true,
      student: { select: { id: true, hostelFacility: true, busFacility: true } },
      section: { select: { schoolClass: { select: { id: true, name: true, order: true } } } },
    },
  });

  if (enrollments.length === 0) {
    return NextResponse.json(
      { error: "No enrolled students found for that selection." },
      { status: 400 }
    );
  }

  const lines: Line[] = [];
  const studentClass = new Map<string, string>();
  const classStats = new Map<string, ClassStats>();
  const missingRates = new Map<string, Set<string>>();
  let boardersWithBus = 0;
  const oneTimeMonth = firstMonthOfYear(academicYear.startDate);

  function noteMissing(className: string, isBoarder: boolean, feeType: FeeTypeName, studentId: string) {
    const who = isBoarder ? "boarders" : "day scholars";
    const msg = `No ${FEE_TYPE_LABELS[feeType]} rate set for ${className} ${who}`;
    if (!missingRates.has(msg)) missingRates.set(msg, new Set());
    missingRates.get(msg)!.add(studentId);
  }

  for (const enr of enrollments) {
    const student = enr.student;
    const schoolClass = enr.section.schoolClass;
    const isBoarder = student.hostelFacility;

    studentClass.set(student.id, schoolClass.id);

    let stats = classStats.get(schoolClass.id);
    if (!stats) {
      stats = {
        className: schoolClass.name,
        order: schoolClass.order,
        students: 0,
        boarders: 0,
        busUsers: 0,
        linesToCreate: 0,
        amountToCreate: 0,
      };
      classStats.set(schoolClass.id, stats);
    }
    stats.students += 1;
    if (isBoarder) stats.boarders += 1;

    const paysTransport = student.busFacility && !isBoarder;
    if (paysTransport) stats.busUsers += 1;
    if (student.busFacility && isBoarder) boardersWithBus += 1;

    const add = (feeType: FeeTypeName, ym: YearMonth) => {
      const amount = rates.get(`${schoolClass.id}|${isBoarder}|${feeType}`);
      if (amount === undefined) {
        noteMissing(schoolClass.name, isBoarder, feeType, student.id);
        return;
      }
      lines.push({ studentId: student.id, feeType, month: ym.month, year: ym.year, amountDue: amount });
    };

    for (const ym of selectedMonths) {
      add("TUITION", ym);
      if (isBoarder) add("HOSTEL", ym);
      if (paysTransport) add("TRANSPORT", ym);
    }

    if (includeOneTime) {
      add("ANNUAL", oneTimeMonth);
      if (enr.isNewAdmission) add("ADMISSION", oneTimeMonth);
    }
  }

  const studentIds = Array.from(studentClass.keys());
  const existingRows = await prisma.feeDue.findMany({
    where: { academicYearId, studentId: { in: studentIds } },
    select: { studentId: true, feeType: true, month: true, year: true },
  });

  const existing = new Set(
    existingRows.map((r) => `${r.studentId}|${r.feeType}|${r.month}|${r.year}`)
  );

  const toCreate = lines.filter(
    (l) => !existing.has(`${l.studentId}|${l.feeType}|${l.month}|${l.year}`)
  );
  const alreadyExist = lines.length - toCreate.length;

  const byTypeMap = new Map<FeeTypeName, { lines: number; amount: number }>();
  let amountToCreate = 0;
  for (const l of toCreate) {
    amountToCreate += l.amountDue;

    const t = byTypeMap.get(l.feeType) ?? { lines: 0, amount: 0 };
    t.lines += 1;
    t.amount += l.amountDue;
    byTypeMap.set(l.feeType, t);

    const cId = studentClass.get(l.studentId);
    const cs = cId ? classStats.get(cId) : undefined;
    if (cs) {
      cs.linesToCreate += 1;
      cs.amountToCreate += l.amountDue;
    }
  }

  const byType = Array.from(byTypeMap.entries()).map(([feeType, v]) => ({
    feeType,
    label: FEE_TYPE_LABELS[feeType],
    lines: v.lines,
    amount: Math.round(v.amount),
  }));

  const byClass = Array.from(classStats.values())
    .sort((a, b) => a.order - b.order)
    .map((c) => ({ ...c, amountToCreate: Math.round(c.amountToCreate) }));

  const warnings: string[] = [];
  for (const [msg, ids] of missingRates.entries()) {
    warnings.push(`${msg} - skipped for ${ids.size} student(s).`);
  }
  if (boardersWithBus > 0) {
    warnings.push(
      `${boardersWithBus} boarding student(s) are also marked as bus users. Transport is not charged to boarders, so it was skipped.`
    );
  }

  const summary = {
    dryRun,
    academicYear: academicYear.label,
    monthsSelected: selectedMonths.map(monthLabel),
    includeOneTime,
    totals: {
      students: studentIds.length,
      linesToCreate: toCreate.length,
      alreadyExist,
      amountToCreate: Math.round(amountToCreate),
    },
    byClass,
    byType,
    warnings,
  };

  if (dryRun) {
    return NextResponse.json(summary);
  }

  let created = 0;
  try {
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < toCreate.length; i += CHUNK_SIZE) {
        const chunk = toCreate.slice(i, i + CHUNK_SIZE);
        const result = await tx.feeDue.createMany({
          data: chunk.map((l) => ({
            studentId: l.studentId,
            academicYearId,
            feeType: l.feeType,
            month: l.month,
            year: l.year,
            amountDue: l.amountDue,
          })),
          skipDuplicates: true,
        });
        created += result.count;
      }

      await recordAudit(tx, {
        actorUserId: session.user.id,
        action: "FEES_GENERATE",
        entityType: "AcademicYear",
        entityId: academicYearId,
        after: {
          classId,
          months: summary.monthsSelected,
          includeOneTime,
          created,
          skippedExisting: alreadyExist,
        },
      });
    });
  } catch (error) {
    console.error("Fee generation error:", error);
    return NextResponse.json(
      {
        error:
          "Something went wrong while creating fees. Nothing was duplicated - you can safely run it again.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ...summary, created });
}