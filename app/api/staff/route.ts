// app/api/staff/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const staff = await prisma.staff.findMany({
    include: { user: true },
    orderBy: { firstName: "asc" },
  });

  return NextResponse.json(staff);
}

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    firstName,
    lastName,
    designation,
    phone,
    email,
    dateOfJoining,
    createLogin,
  } = body;

  if (!firstName || !lastName || !designation) {
    return NextResponse.json(
      { error: "firstName, lastName, and designation are required" },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Generate staff code: RBS-STF-0001 style
      const count = await tx.staff.count();
      const staffCode = `RBS-STF-${String(count + 1).padStart(4, "0")}`;

      let userId: string | undefined;
      let username: string | undefined;
      let tempPassword: string | undefined;

      if (createLogin) {
        username = staffCode.replace(/-/g, "").toLowerCase();
        tempPassword = `${lastName}@${staffCode.slice(-4)}`;
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        const user = await tx.user.create({
          data: {
            username,
            passwordHash,
            role: "TEACHER",
            mustChangePassword: true,
          },
        });
        userId = user.id;
      }

      const staff = await tx.staff.create({
        data: {
          staffCode,
          firstName,
          lastName,
          designation,
          phone: phone || null,
          email: email || null,
          dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : null,
          isActive: true,
          userId: userId || null,
        },
      });

      return { staff, username, tempPassword };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create staff member." },
      { status: 500 }
    );
  }
}