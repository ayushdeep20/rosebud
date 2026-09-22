// app/api/students/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/permissions";
import { createStudent, listStudents } from "@/lib/students/service";

export async function GET() {
  const session = await auth();
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const students = await listStudents();
  return NextResponse.json(students);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    firstName, lastName, dateOfBirth, admissionNumber,
    gender, academicYearId, sectionId, rollNumber, aadhaarNumber,
    hostelFacility, busFacility, busNo, busPoint,
  } = body;

  if (!firstName || !lastName || !dateOfBirth || !admissionNumber || !academicYearId || !sectionId) {
    return NextResponse.json(
      { error: "firstName, lastName, dateOfBirth, admissionNumber, academicYearId, and sectionId are required" },
      { status: 400 }
    );
  }

  try {
    const result = await createStudent(
      {
        firstName, lastName, dateOfBirth, admissionNumber, gender,
        academicYearId, sectionId, rollNumber, aadhaarNumber,
        hostelFacility, busFacility, busNo, busPoint,
      },
      session.user.id
    );
    return NextResponse.json(result, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "Academic year not found") {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    const code = (err as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json(
        { error: "A student with that admission number already exists." },
        { status: 409 }
      );
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to create student." }, { status: 500 });
  }
}