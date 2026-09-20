import { prisma } from "@/lib/prisma";
import AttendanceReport from "@/components/admin/AttendanceReport";

export default async function AdminAttendancePage() {
  const sections = await prisma.section.findMany({
    include: { schoolClass: true },
    orderBy: [{ schoolClass: { order: "asc" } }, { name: "asc" }],
  });

  const sectionOptions = sections.map((s) => ({
    sectionId: s.id,
    label: `${s.schoolClass.name} — Section ${s.name}`,
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-semibold mb-6">Attendance Reports</h1>
      <AttendanceReport sections={sectionOptions} />
    </div>
  );
}