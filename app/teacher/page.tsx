// app/teacher/page.tsx

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function TeacherDashboard() {
  const session = await auth();

  // Not logged in
  if (!session?.user) {
    redirect("/login");
  }

  // This page is only for teachers.
  // Keep the server-side check even though proxy/middleware
  // should already protect the route.
  if (session.user.role !== "TEACHER") {
    redirect("/login");
  }

  // Find the teacher profile using the authenticated user's ID.
  // This replaces the old username-based lookup.
  const teacher = await prisma.teacher.findUnique({
    where: {
      userId: session.user.id,
    },
    include: {
      assignments: {
        include: {
          subject: true,
          section: {
            include: {
              schoolClass: true,
            },
          },
          academicYear: true,
        },
        orderBy: {
          academicYear: {
            startDate: "desc",
          },
        },
      },
    },
  });

  // The login exists, but the account is not linked to a Teacher record.
  if (!teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="text-center">
          <p className="text-gray-500">
            No teacher profile found for your account.
          </p>

          <p className="text-gray-400 text-sm mt-2">
            Please contact the Admin.
          </p>
        </div>
      </div>
    );
  }

  // Assignments are ordered newest academic year first,
  // so the first assignment gives us the latest academic year.
  const currentYear =
    teacher.assignments[0]?.academicYear.label ?? "";

  // Show only assignments belonging to the current/latest year.
  const currentAssignments = teacher.assignments.filter(
    (assignment) =>
      assignment.academicYear.label === currentYear
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Teacher heading */}
      <h1 className="text-2xl font-semibold mb-2">
        Welcome, {teacher.firstName} {teacher.lastName}
      </h1>

      <p className="text-gray-500 mb-6">
        Academic Year: {currentYear || "Not assigned"}
      </p>

      {/* Unit Tests shortcut */}
      <div className="mb-6">
        <Link
          href="/teacher/unit-tests"
          className="inline-block bg-white rounded-xl shadow-md px-4 py-3 text-sm font-medium hover:shadow-lg"
        >
          📝 Unit Tests
        </Link>
      </div>

      {/* Teacher actions */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Link
          href="/teacher/attendance"
          className="bg-white rounded-xl shadow-md p-6 w-64 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-rose-600 font-medium mb-1">
            Mark Attendance
          </h2>

          <p className="text-gray-500 text-sm">
            Take today&apos;s attendance
          </p>
        </Link>
      </div>

      {/* Assignments */}
      <div className="bg-white rounded-xl shadow-md p-6 max-w-2xl">
        <h2 className="text-lg font-medium mb-4">
          Your Assignments
        </h2>

        {currentAssignments.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No assignments for this year yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {currentAssignments.map((assignment) => (
              <li
                key={assignment.id}
                className="border-b pb-2 text-sm"
              >
                <span className="font-medium">
                  {assignment.subject.name}
                </span>

                <span className="text-gray-500">
                  {" "}
                  — {assignment.section.schoolClass.name} —
                  {" "}
                  Section {assignment.section.name}
                </span>

                {assignment.isClassTeacher && (
                  <span className="ml-2 text-xs bg-rose-100 text-rose-700 rounded px-1.5 py-0.5">
                    Class Teacher
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}