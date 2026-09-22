import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const students = await prisma.student.findMany({
      include: {
        user: true,
        enrollments: {
          include: {
            section: {
              include: {
                schoolClass: true,
              },
            },
          },
        },
      },
      orderBy: { firstName: "asc" },
    });

    const formattedStudents = students.map((s) => {
      const activeEnrollment = s.enrollments[s.enrollments.length - 1];

      let derivedClass = "Unassigned";

      if (activeEnrollment?.section) {
        const className = activeEnrollment.section.schoolClass?.name;
        const sectionName = activeEnrollment.section.name;

        if (className && sectionName) {
          derivedClass = `${className} - ${sectionName}`;
        } else if (className) {
          derivedClass = className;
        } else if (sectionName) {
          derivedClass = sectionName;
        }
      }

      const admNo = s.admissionNumber || s.studentCode || "N/A";

      return {
        id: s.id,
        userId: s.userId,
        admissionNo: admNo,
        admissionNumber: admNo,
        firstName: s.firstName,
        lastName: s.lastName,
        rollNumber: activeEnrollment?.rollNumber != null ? String(activeEnrollment.rollNumber) : "N/A",
        className: derivedClass,
        username: s.user?.username ?? admNo,
        hasUserAccount: !!s.userId,
      };
    });

    return NextResponse.json({ students: formattedStudents });
  } catch (error) {
    console.error("Fetch students error:", error);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}