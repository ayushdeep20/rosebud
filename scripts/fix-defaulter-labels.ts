// scripts/fix-defaulter-labels.ts
import { prisma } from "../lib/prisma";

async function main() {
  const result = await prisma.feeDue.updateMany({
    where: {
      month: 0,
      feeType: "TUITION",
    },
    data: {
      feeType: "PREVIOUS_DUES",
      description: "Opening balance (before portal)",
    },
  });

  console.log(`Relabeled ${result.count} record(s) from TUITION to PREVIOUS_DUES.`);
}

main()
  .catch(console.error)
  .finally(() => process.exit());