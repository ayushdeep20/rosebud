import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AttendanceMarker from "@/components/teacher/AttendanceMarker";

export default async function TeacherAttendancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const teacher = await prisma.teacher.findFirst({
    where: { user: { username: session.user.username as string } },
    include: {
      assignments: {
        include: {
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
        <p className="text-gray-500">No assignments found. Contact Admin.</p>
      </div>
    );
  }

  const currentYear = teacher.assignments[0]?.academicYear.label ?? "";
  const currentAssignments = teacher.assignments.filter(
    (a) => a.academicYear.label === currentYear
  );

  type SectionInfo = { sectionId: string; label: string; academicYearId: string };
  const sectionMap = new Map<string, SectionInfo>();
  for (const a of currentAssignments) {
    if (!sectionMap.has(a.sectionId)) {
      sectionMap.set(a.sectionId, {
        sectionId: a.sectionId,
        label: `${a.section.schoolClass.name} — Section ${a.section.name}`,
        academicYearId: a.academicYearId,
      });
    }
  }
  const sections = Array.from(sectionMap.values());

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-semibold mb-2">Mark Attendance</h1>
      <p className="text-gray-500 mb-6">Academic Year: {currentYear}</p>

      {sections.length === 0 ? (
        <p className="text-gray-500 text-sm">No sections assigned this year.</p>
      ) : (
        <AttendanceMarker sections={sections} />
      )}
    </div>
  );
}