// app/teacher/page.tsx
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function TeacherDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const teacher = await prisma.teacher.findFirst({
    where: { user: { username: session.user.username as string } },
    include: {
      assignments: {
        include: {
          subject: true,
          section: { include: { schoolClass: true } },
          academicYear: true,
        },
        orderBy: { academicYear: { startDate: "desc" } },
      },
    },
  });

  if (!teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">
          No assignments found for your account. Contact Admin.
        </p>
      </div>
    );
  }

  const currentYear = teacher.assignments[0]?.academicYear.label ?? "";
  const currentAssignments = teacher.assignments.filter(
    (a) => a.academicYear.label === currentYear
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-semibold mb-2">
        Welcome, {teacher.firstName} {teacher.lastName}
      </h1>
      <p className="text-gray-500 mb-6">Academic Year: {currentYear}</p>

      <div className="bg-white rounded-xl shadow-md p-6 max-w-2xl">
        <h2 className="text-lg font-medium mb-4">Your Assignments</h2>
        {currentAssignments.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No assignments for this year yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {currentAssignments.map((a) => (
              <li key={a.id} className="border-b pb-2 text-sm">
                <span className="font-medium">{a.subject.name}</span>
                <span className="text-gray-500">
                  {" "}
                  — {a.section.schoolClass.name} — Section {a.section.name}
                </span>
                {a.isClassTeacher && (
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