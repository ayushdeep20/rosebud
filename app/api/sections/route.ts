// app/api/sections/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sections = await prisma.section.findMany({
    include: { schoolClass: true },
    orderBy: [{ schoolClass: { order: "asc" } }, { name: "asc" }],
  });
  return NextResponse.json(sections);
}

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, schoolClassId } = body;

  if (!name || !schoolClassId) {
    return NextResponse.json(
      { error: "name and schoolClassId are required" },
      { status: 400 }
    );
  }

  try {
    const section = await prisma.section.create({
      data: { name: name.toUpperCase(), schoolClassId },
      include: { schoolClass: true },
    });
    return NextResponse.json(section, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "That section already exists for this class." },
      { status: 409 }
    );
  }
}