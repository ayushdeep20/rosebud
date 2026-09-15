// app/api/classes/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const classes = await prisma.schoolClass.findMany({
    orderBy: { order: "asc" },
  });
  return NextResponse.json(classes);
}

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, order } = body;

  if (!name || order === undefined || order === null) {
    return NextResponse.json(
      { error: "name and order are required" },
      { status: 400 }
    );
  }

  try {
    const schoolClass = await prisma.schoolClass.create({
      data: { name, order: Number(order) },
    });
    return NextResponse.json(schoolClass, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "A class with that name or order already exists." },
      { status: 409 }
    );
  }
}