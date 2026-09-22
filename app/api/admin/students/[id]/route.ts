import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        user: true,
        enrollments: {
          include: {
            section: {
              include: {
                schoolClass: true,
              },
            },
            academicYear: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const activeEnrollment = student.enrollments[student.enrollments.length - 1];

    return NextResponse.json({
      student: {
        ...student,
        rollNumber: activeEnrollment?.rollNumber ?? null,
        className: activeEnrollment?.section?.schoolClass?.name ?? null,
        sectionName: activeEnrollment?.section?.name ?? null,
        academicYearLabel: activeEnrollment?.academicYear?.label ?? null,
        sectionId: activeEnrollment?.sectionId ?? null,
      },
    });
  } catch (error: any) {
    console.error("Fetch student details error:", error);
    return NextResponse.json(
      { error: "Failed to fetch student details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const { rollNumber, sectionId, ...studentFields } = body;

    if (studentFields.dateOfBirth) {
      studentFields.dateOfBirth = new Date(studentFields.dateOfBirth);
    }

    if (studentFields.height !== undefined) {
      studentFields.height = studentFields.height ? parseFloat(studentFields.height) : null;
    }
    if (studentFields.weight !== undefined) {
      studentFields.weight = studentFields.weight ? parseFloat(studentFields.weight) : null;
    }

    // Omit relational non-schema fields before updating Prisma
    delete studentFields.user;
    delete studentFields.enrollments;
    delete studentFields.className;
    delete studentFields.sectionName;
    delete studentFields.academicYearLabel;

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: studentFields,
    });

    if (rollNumber !== undefined) {
      const latestEnrollment = await prisma.enrollment.findFirst({
        where: { studentId: id },
        orderBy: { id: "desc" },
      });

      if (latestEnrollment) {
        await prisma.enrollment.update({
          where: { id: latestEnrollment.id },
          data: {
            rollNumber: rollNumber ? parseInt(rollNumber) : null,
            ...(sectionId && { sectionId }),
          },
        });
      }
    }

    return NextResponse.json({
      message: "Student details updated successfully",
      student: updatedStudent,
    });
  } catch (error: any) {
    console.error("Update student error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update student details" },
      { status: 500 }
    );
  }
}