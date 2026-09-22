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

    const student: any = await prisma.student.findUnique({
      where: { id },
      include: {
        enrollments: {
          include: {
            section: {
              include: {
                schoolClass: true,
              },
            },
          },
        },
        feePayments: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const activeEnrollment = student.enrollments?.[student.enrollments.length - 1];
    let derivedClass = "Unassigned";
    if (activeEnrollment?.section) {
      const className = activeEnrollment.section.schoolClass?.name;
      const sectionName = activeEnrollment.section.name;
      if (className && sectionName) derivedClass = `${className} - ${sectionName}`;
      else if (className) derivedClass = className;
    }

    const payments = Array.isArray(student.feePayments) ? student.feePayments : [];
    const totalPaid = payments.reduce(
      (sum: number, p: any) => sum + Number(p.amount || 0),
      0
    );

    const assignedFee = student.busFacility ? 28000 : 22000;
    const dues = Math.max(0, assignedFee - totalPaid);

    return NextResponse.json({
      student: {
        ...student,
        className: derivedClass,
        rollNumber: activeEnrollment?.rollNumber ?? "N/A",
        totalAssignedFee: assignedFee,
        totalPaidAmount: totalPaid,
        totalOutstandingDues: dues,
        feeComponents: [
          { name: "Annual Tuition Fee", type: "Annual", amount: 18000 },
          { name: "Development & Infrastructure", type: "Annual", amount: 4000 },
          ...(student.busFacility
            ? [{ name: "Transport / Bus Charges", type: "Annual", amount: 6000 }]
            : []),
        ],
        payments,
      },
    });
  } catch (error) {
    console.error("Student fee breakdown error:", error);
    return NextResponse.json({ error: "Failed to fetch student fee details" }, { status: 500 });
  }
}