// scripts/seed-classes.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CLASSES: { name: string; order: number }[] = [
  { name: "LKG", order: -2 },
  { name: "UKG", order: -1 },
  { name: "Class 1", order: 1 },
  { name: "Class 2", order: 2 },
  { name: "Class 3", order: 3 },
  { name: "Class 4", order: 4 },
  { name: "Class 5", order: 5 },
  { name: "Class 6", order: 6 },
  { name: "Class 7", order: 7 },
  { name: "Class 8", order: 8 },
  { name: "Class 9", order: 9 },
  { name: "Class 10", order: 10 },
];

async function main() {
  for (const c of CLASSES) {
    const schoolClass = await prisma.schoolClass.upsert({
      where: { name: c.name },
      update: {},
      create: { name: c.name, order: c.order },
    });

    await prisma.section.upsert({
      where: {
        schoolClassId_name: { schoolClassId: schoolClass.id, name: "A" },
      },
      update: {},
      create: { schoolClassId: schoolClass.id, name: "A" },
    });

    console.log(`Ready: ${c.name} — Section A`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());