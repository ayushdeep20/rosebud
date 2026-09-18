// app/admin/assignments/page.tsx
"use client";

import { useEffect, useState } from "react";

type AcademicYear = { id: string; label: string };
type Subject = { id: string; name: string; code: string };
type SchoolClass = { id: string; name: string };
type Section = { id: string; name: string; schoolClass: SchoolClass };
type StaffMember = {
  id: string;
  staffCode: string;
  firstName: string;
  lastName: string;
  designation: string;
  user: { username: string } | null;
};
type Assignment = {
  id: string;
  isClassTeacher: boolean;
  teacher: { firstName: string; lastName: string };
  subject: { name: string; code: string };
  section: { name: string; schoolClass: { name: string } };
  academicYear: { label: string };
};

export default function AssignmentsPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [staffId, setStaffId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadAll = async () => {
    const [y, sub, sec, st, asgn] = await Promise.all([
      fetch("/api/academic-years").then((r) => r.json()),
      fetch("/api/subjects").then((r) => r.json()),
      fetch("/api/sections").then((r) => r.json()),
      fetch("/api/staff").then((r) => r.json()),
      fetch("/api/teacher-assignments").then((r) => r.json()),
    ]);
    setYears(y);
    setSubjects(sub);
    setSections(sec);
    setStaffList(st);
    setAssignments(asgn);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/teacher-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        staffId,
        subjectId,
        sectionId,
        academicYearId,
        isClassTeacher,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
      return;
    }

    setStaffId("");
    setSubjectId("");
    setSectionId("");
    setIsClassTeacher(false);
    loadAll();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-semibold mb-6">Teacher Assignments</h1>

      <div className="bg-white rounded-xl shadow-md p-6 max-w-2xl mb-8">
        <h2 className="text-lg font-medium mb-4">Assign Teacher to Class</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Academic Year
            </label>
            <select
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              required
            >
              <option value="">Select year</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Staff Member
            </label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              required
            >
              <option value="">Select staff member</option>
              {staffList
                .filter((s) => s.user !== null)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} — {s.designation} ({s.staffCode}
                    )
                  </option>
                ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Only staff members with a portal login can be assigned.
            </p>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Subject</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                required
              >
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">
                Class — Section
              </label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                required
              >
                <option value="">Select section</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.schoolClass.name} — {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isClassTeacher"
              checked={isClassTeacher}
              onChange={(e) => setIsClassTeacher(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="isClassTeacher" className="text-sm">
              This teacher is the Class Teacher for this section
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-rose-500 text-white rounded-lg px-4 py-2 font-medium hover:bg-rose-600 disabled:opacity-50"
          >
            {loading ? "Assigning..." : "Create Assignment"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 max-w-2xl">
        <h2 className="text-lg font-medium mb-4">Current Assignments</h2>
        {assignments.length === 0 ? (
          <p className="text-gray-500 text-sm">No assignments yet.</p>
        ) : (
          <ul className="space-y-2">
            {assignments.map((a) => (
              <li key={a.id} className="border-b pb-2 text-sm">
                <span className="font-medium">
                  {a.teacher.firstName} {a.teacher.lastName}
                </span>
                <span className="text-gray-500">
                  {" "}
                  — {a.subject.name} —{" "}
                  {a.section.schoolClass.name} {a.section.name}
                </span>
                <span className="text-gray-400"> ({a.academicYear.label})</span>
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