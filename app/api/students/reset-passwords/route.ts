// app/api/students/reset-passwords/route.ts
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

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { academicYearId } = body as { academicYearId: string };

  if (!academicYearId) {
    return NextResponse.json(
      { error: "academicYearId is required" },
      { status: 400 }
    );
  }

  const students = await prisma.student.findMany({
    where: {
      enrollments: { some: { academicYearId } },
    },
    include: { user: true },
    orderBy: { studentCode: "asc" },
  });

  const results: {
    studentCode: string;
    username: string;
    tempPassword: string;
  }[] = [];

  for (const student of students) {
    const tempPassword = randomPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await prisma.user.update({
      where: { id: student.userId },
      data: { passwordHash, mustChangePassword: true },
    });

    results.push({
      studentCode: student.studentCode,
      username: student.user.username,
      tempPassword,
    });
  }

  return NextResponse.json({ results });
}