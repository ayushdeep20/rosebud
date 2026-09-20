// app/api/subjects/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  // Admins and teachers may READ subjects.
  // Only admins can create subjects.
  if (
    session?.user?.role !== "ADMIN" &&
    session?.user?.role !== "TEACHER"
  ) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const subjects = await prisma.subject.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return NextResponse.json(subjects);
}

export async function POST(request: Request) {
  const session = await auth();

  // Only admins may create subjects.
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const body = await request.json();

  const { name, code } = body;

  if (!name || !code) {
    return NextResponse.json(
      {
        error: "name and code are required",
      },
      { status: 400 }
    );
  }

  try {
    const subject = await prisma.subject.create({
      data: {
        name: String(name).trim(),
        code: String(code).trim().toUpperCase(),
      },
    });

    return NextResponse.json(subject, {
      status: 201,
    });
  } catch {
    return NextResponse.json(
      {
        error: "That subject already exists.",
      },
      { status: 409 }
    );
  }
}