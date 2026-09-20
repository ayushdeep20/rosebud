import { prisma } from "../lib/prisma";

async function main() {
  const student = await prisma.student.findFirst({
    where: {
      firstName: { contains: "Raunak", mode: "insensitive" },
    },
    include: {
      feeDues: {
        orderBy: [{ year: "asc" }, { month: "asc" }],
      },
    },
  });

  if (!student) {
    console.log("No student found matching 'Raunak'");
    return;
  }

  console.log(`Student: ${student.firstName} ${student.lastName} (${student.studentCode})`);
  console.log(`Total fee due records: ${student.feeDues.length}`);
  console.log("");

  for (const due of student.feeDues) {
    console.log(
      `${due.month}/${due.year} | ${due.feeType} | Due: ₹${due.amountDue} | Paid: ₹${due.amountPaid} | Status: ${due.status}`
    );
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit());