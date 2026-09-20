import { prisma } from "@/lib/prisma";

async function main() {
  const academicYear = await prisma.academicYear.findUnique({
    where: {
      label: "2026-27",
    },
  });

  if (!academicYear) {
    console.log("2026-27 academic year was not found.");
    return;
  }

  console.log(
    `Academic Year: ${academicYear.label} (${academicYear.id})`
  );

  const sections = await prisma.section.findMany({
    include: {
      schoolClass: true,
      enrollments: {
        where: {
          academicYearId: academicYear.id,
        },
        select: {
          id: true,
          studentId: true,
          rollNumber: true,
        },
      },
    },
    orderBy: [
      {
        schoolClass: {
          order: "asc",
        },
      },
      {
        name: "asc",
      },
    ],
  });

  console.log("\nEnrollment counts:\n");

  for (const section of sections) {
    console.log(
      `${section.schoolClass.name} — Section ${section.name}: ${section.enrollments.length} students`
    );
  }

  const total = sections.reduce(
    (sum, section) => sum + section.enrollments.length,
    0
  );

  console.log(`\nTOTAL ENROLLMENTS: ${total}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });