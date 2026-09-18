// scripts/reset-staff-password.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const newPassword = "Teacher@1234";

  const staff = await prisma.staff.findFirst({
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  if (!staff?.user) {
    console.log("No staff member with a login found.");
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: staff.user.id },
    data: { passwordHash, mustChangePassword: true },
  });

  console.log(`Password reset for: ${staff.user.username}`);
  console.log(`New password: ${newPassword}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());