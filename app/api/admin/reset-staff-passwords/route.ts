// app/api/admin/reset-staff-passwords/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

function randomPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export async function POST() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const staffWithLogins = await prisma.staff.findMany({
    where: { userId: { not: null } },
    include: { user: true },
    orderBy: { staffCode: "asc" },
  });

  const results: {
    staffCode: string;
    name: string;
    username: string;
    tempPassword: string;
  }[] = [];

  for (const staff of staffWithLogins) {
    if (!staff.user) continue;
    const tempPassword = randomPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await prisma.user.update({
      where: { id: staff.user.id },
      data: { passwordHash, mustChangePassword: true },
    });

    results.push({
      staffCode: staff.staffCode,
      name: `${staff.firstName} ${staff.lastName}`,
      username: staff.user.username,
      tempPassword,
    });
  }

  return NextResponse.json({ results });
}