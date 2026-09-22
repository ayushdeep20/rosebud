// app/api/students/[id]/route.ts
// Updates a student's boarding (hostel) and transport (bus) status
// after admission - the one place this changes over time, as students
// move in or out of the hostel or start/stop using the bus.
//
// PATCH body (all optional - only send what changed):
//   hostelFacility  boolean
//   busFacility     boolean   (ignored/forced false if hostelFacility is true)
//   busNo           string | null
//   busPoint        string | null

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/permissions";
import { updateBoardingTransport } from "@/lib/students/service";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!requireAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: {
    hostelFacility?: boolean;
    busFacility?: boolean;
    busNo?: string | null;
    busPoint?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const result = await updateBoardingTransport(
      id,
      {
        hostelFacility: body.hostelFacility,
        busFacility: body.busFacility,
        busNo: body.busNo,
        busPoint: body.busPoint,
      },
      session.user.id
    );
    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "Student not found") {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to update student." }, { status: 500 });
  }
}
