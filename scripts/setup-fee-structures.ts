// scripts/setup-fee-structures.ts
import { prisma } from "../lib/prisma";

async function main() {
  const academicYear = await prisma.academicYear.findFirst({
    where: { label: "2026-27" },
  });

  if (!academicYear) {
    console.error("Academic year 2026-27 not found. Create it first.");
    return;
  }

  const classes = await prisma.schoolClass.findMany();
  const classByName = new Map(classes.map((c) => [c.name, c.id]));

  function classId(name: string): string {
    const id = classByName.get(name);
    if (!id) throw new Error(`Class not found: ${name}`);
    return id;
  }

  const dayScholarRates: [string, number | null, number, number][] = [
    ["LKG", 14000, 4000, 1500],
    ["UKG", 14000, 4000, 1500],
    ["Class 1", 17000, 4000, 1600],
    ["Class 2", 17000, 4000, 1600],
    ["Class 3", 18000, 4000, 1700],
    ["Class 4", 18000, 4000, 1700],
    ["Class 5", 19000, 4000, 1800],
    ["Class 6", 19000, 4000, 1800],
    ["Class 7", 20000, 4000, 1900],
    ["Class 8", 20000, 4000, 2100],
    ["Class 9", 20000, 4000, 2300],
    ["Class 10", null, 4000, 2400],
  ];

  const boarderRates: [string, number | null, number, number, number][] = [
    ["LKG", 20000, 4500, 3700, 1500],
    ["UKG", 20000, 4500, 3700, 1500],
    ["Class 1", 20000, 4500, 3700, 1700],
    ["Class 2", 20000, 4500, 3700, 1700],
    ["Class 3", 20000, 4500, 3800, 1700],
    ["Class 4", 20000, 4500, 3800, 1700],
    ["Class 5", 20000, 4500, 4000, 1800],
    ["Class 6", 20000, 4500, 4000, 1800],
    ["Class 7", 20000, 4500, 4000, 1900],
    ["Class 8", 20000, 4500, 4000, 2100],
    ["Class 9", 20000, 4500, 4000, 2300],
    ["Class 10", null, 4500, 4000, 2400],
  ];

  const TRANSPORT_RATE = 900;

  let count = 0;

  async function upsertRate(
    schoolClassId: string,
    isBoarder: boolean,
    feeType: "ADMISSION" | "ANNUAL" | "TUITION" | "TRANSPORT" | "HOSTEL",
    amount: number
  ) {
    await prisma.feeStructure.upsert({
      where: {
        academicYearId_schoolClassId_isBoarder_feeType: {
          academicYearId: academicYear!.id,
          schoolClassId,
          isBoarder,
          feeType,
        },
      },
      update: { amount },
      create: {
        academicYearId: academicYear!.id,
        schoolClassId,
        isBoarder,
        feeType,
        amount,
      },
    });
    count++;
  }

  for (const [className, admission, annual, tuition] of dayScholarRates) {
    const id = classId(className);
    if (admission !== null) {
      await upsertRate(id, false, "ADMISSION", admission);
    }
    await upsertRate(id, false, "ANNUAL", annual);
    await upsertRate(id, false, "TUITION", tuition);
    await upsertRate(id, false, "TRANSPORT", TRANSPORT_RATE);
  }

  for (const [className, admission, annual, mess, tuition] of boarderRates) {
    const id = classId(className);
    if (admission !== null) {
      await upsertRate(id, true, "ADMISSION", admission);
    }
    await upsertRate(id, true, "ANNUAL", annual);
    await upsertRate(id, true, "HOSTEL", mess);
    await upsertRate(id, true, "TUITION", tuition);
  }

  console.log(`Done. Created/updated ${count} fee structure rows for ${academicYear.label}.`);
}

main()
  .catch(console.error)
  .finally(() => process.exit());