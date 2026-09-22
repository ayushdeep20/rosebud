// scripts/set-boarding-bus-status.ts
//
// One-time reconciliation: sets every student's boarding (hostel) and
// bus status from two simple lists, since the original student import
// left everyone as "Day Scholar, no bus" regardless of reality.
//
// This treats each list as the CURRENT, COMPLETE picture for that
// facility: anyone in the list becomes true, anyone not in the list
// (but already in the database) becomes false. That is deliberate -
// it corrects students who have since left the hostel or stopped
// using the bus, not just add new ones. If you only have one list
// (say, hostel but not bus), only pass that one; the other flag is
// left untouched.
//
// Usage:
//   1. Put your file(s) in the scripts folder:
//        scripts/hostel_list.xlsx   - one column of admission numbers,
//                                     the students CURRENTLY in the hostel
//        scripts/bus_list.xlsx     - one column of admission numbers,
//                                     the students CURRENTLY using the bus
//      Either file can be a single-column list, or a fuller sheet - the
//      script looks for a column whose header contains "adm" (e.g.
//      "Adm. No.", "Admission Number") and ignores the rest.
//
//   2. Preview first (writes nothing):
//        pnpm tsx scripts/set-boarding-bus-status.ts
//
//   3. Read the report. If it looks right, commit:
//        pnpm tsx scripts/set-boarding-bus-status.ts --commit
//
// A student on BOTH lists is treated as a boarder (hostel wins), since
// a boarder does not pay separate transport - this is flagged in the
// report so you can double check it's not a data-entry mistake.

import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

const prisma = new PrismaClient();

const HOSTEL_FILE = path.join(process.cwd(), "scripts", "hostel_list.xlsx");
const BUS_FILE = path.join(process.cwd(), "scripts", "bus_list.xlsx");
const COMMIT = process.argv.includes("--commit");

function readAdmissionNumbers(filePath: string): Set<string> | null {
  if (!fs.existsSync(filePath)) return null;

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  if (rows.length === 0) return new Set();

  const headers = Object.keys(rows[0]);
  const admHeader =
    headers.find((h) => h.toLowerCase().includes("adm")) ?? headers[0];

  const numbers = new Set<string>();
  for (const row of rows) {
    const raw = row[admHeader];
    const value = String(raw ?? "").trim();
    if (value && value.toLowerCase() !== "total students") {
      numbers.add(value);
    }
  }
  return numbers;
}

async function main() {
  const hostelList = readAdmissionNumbers(HOSTEL_FILE);
  const busList = readAdmissionNumbers(BUS_FILE);

  if (!hostelList && !busList) {
    console.error(
      `Neither file was found.\nPut one or both of these in the scripts folder:\n  ${HOSTEL_FILE}\n  ${BUS_FILE}`
    );
    return;
  }
  if (hostelList) console.log(`Hostel list: ${hostelList.size} admission number(s).`);
  if (busList) console.log(`Bus list: ${busList.size} admission number(s).`);
  console.log(COMMIT ? "\nMode: COMMIT (this will write changes)\n" : "\nMode: PREVIEW (nothing will be written)\n");

  const students = await prisma.student.findMany({
    select: {
      id: true,
      admissionNumber: true,
      firstName: true,
      lastName: true,
      hostelFacility: true,
      busFacility: true,
    },
  });
  const byAdmission = new Map(students.map((s) => [s.admissionNumber, s]));

  // Admission numbers from the lists that don't match any student -
  // exactly the situation the earlier defaulters import ran into.
  const notFound: { list: "hostel" | "bus"; admissionNumber: string }[] = [];
  if (hostelList) {
    for (const adm of hostelList) {
      if (!byAdmission.has(adm)) notFound.push({ list: "hostel", admissionNumber: adm });
    }
  }
  if (busList) {
    for (const adm of busList) {
      if (!byAdmission.has(adm)) notFound.push({ list: "bus", admissionNumber: adm });
    }
  }

  const bothLists: string[] = [];
  const changes: {
    student: (typeof students)[number];
    nextHostel: boolean;
    nextBus: boolean;
  }[] = [];

  for (const student of students) {
    const wantsHostel = hostelList ? hostelList.has(student.admissionNumber) : student.hostelFacility;
    const wantsBus = busList ? busList.has(student.admissionNumber) : student.busFacility;

    if (hostelList?.has(student.admissionNumber) && busList?.has(student.admissionNumber)) {
      bothLists.push(`${student.firstName} ${student.lastName} (${student.admissionNumber})`);
    }

    // A boarder never pays separate transport, same rule as the rest
    // of the app.
    const nextHostel = wantsHostel;
    const nextBus = nextHostel ? false : wantsBus;

    if (nextHostel !== student.hostelFacility || nextBus !== student.busFacility) {
      changes.push({ student, nextHostel, nextBus });
    }
  }

  console.log(`\n${changes.length} student(s) will change:\n`);
  for (const c of changes) {
    const from = describe(c.student.hostelFacility, c.student.busFacility);
    const to = describe(c.nextHostel, c.nextBus);
    console.log(
      `  ${c.student.firstName} ${c.student.lastName} (${c.student.admissionNumber}): ${from} -> ${to}`
    );
  }

  if (bothLists.length > 0) {
    console.log(`\n${bothLists.length} student(s) were on BOTH lists (kept as Boarder, bus removed):`);
    for (const line of bothLists) console.log(`  ${line}`);
  }

  if (notFound.length > 0) {
    console.log(`\n${notFound.length} admission number(s) from the list(s) were not found in the database:`);
    for (const item of notFound) console.log(`  ${item.list}: ${item.admissionNumber}`);
    console.log("These were skipped. Check for typos or students not yet added.");
  }

  if (!COMMIT) {
    console.log("\nThis was a preview. Nothing was changed.");
    console.log("Re-run with --commit to apply the changes above.");
    return;
  }

  if (changes.length === 0) {
    console.log("\nNothing to commit.");
    return;
  }

  // A single system-actor id is used for the audit trail here, since a
  // script has no logged-in admin. If you want a specific admin
  // credited, replace SYSTEM_ACTOR_ID below with their user id.
  const SYSTEM_ACTOR_ID = "system-script";

  let applied = 0;
  for (const c of changes) {
    await prisma.$transaction([
      prisma.student.update({
        where: { id: c.student.id },
        data: {
          hostelFacility: c.nextHostel,
          busFacility: c.nextBus,
          ...(c.nextBus ? {} : { busNo: null, busPoint: null }),
        },
      }),
      prisma.auditLog.create({
        data: {
          actorUserId: SYSTEM_ACTOR_ID,
          action: "STUDENT_BOARDING_TRANSPORT_BULK_SET",
          entityType: "Student",
          entityId: c.student.id,
          beforeJson: JSON.stringify({
            hostelFacility: c.student.hostelFacility,
            busFacility: c.student.busFacility,
          }),
          afterJson: JSON.stringify({
            hostelFacility: c.nextHostel,
            busFacility: c.nextBus,
          }),
        },
      }),
    ]);
    applied++;
  }

  console.log(`\nDone. Updated ${applied} student(s).`);
}

function describe(hostel: boolean, bus: boolean): string {
  if (hostel) return "Boarder";
  return bus ? "Day Scholar + Bus" : "Day Scholar";
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
