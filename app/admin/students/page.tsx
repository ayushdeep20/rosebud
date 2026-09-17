// app/admin/students/page.tsx
"use client";

import { useEffect, useState } from "react";

type AcademicYear = { id: string; label: string };
type SchoolClass = { id: string; name: string; order: number };
type Section = { id: string; name: string; schoolClass: SchoolClass };
type StudentRow = {
  id: string;
  studentCode: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  enrollments: {
    section: Section;
    academicYear: AcademicYear;
  }[];
};

export default function StudentsPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [gender, setGender] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{
    username: string;
    tempPassword: string;
  } | null>(null);

  const loadAll = async () => {
    const [y, s, st] = await Promise.all([
      fetch("/api/academic-years").then((r) => r.json()),
      fetch("/api/sections").then((r) => r.json()),
      fetch("/api/students").then((r) => r.json()),
    ]);
    setYears(y);
    setSections(s);
    setStudents(st);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCreated(null);
    setLoading(true);

    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        dateOfBirth,
        admissionNumber,
        gender,
        academicYearId,
        sectionId,
        rollNumber,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
      return;
    }

    const data = await res.json();
    setCreated({ username: data.username, tempPassword: data.tempPassword });
    setFirstName("");
    setLastName("");
    setDateOfBirth("");
    setAdmissionNumber("");
    setGender("");
    setRollNumber("");
    loadAll();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-semibold mb-6">Students</h1>

      <div className="bg-white rounded-xl shadow-md p-6 max-w-2xl mb-8">
        <h2 className="text-lg font-medium mb-4">Add Student</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">—</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Admission Number
            </label>
            <input
              type="text"
              value={admissionNumber}
              onChange={(e) => setAdmissionNumber(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
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
            <div className="w-28">
              <label className="block text-sm font-medium mb-1">
                Roll No.
              </label>
              <input
                type="number"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-rose-500 text-white rounded-lg px-4 py-2 font-medium hover:bg-rose-600 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Add Student"}
          </button>
        </form>

        {created && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
            <p className="font-medium text-green-800">Student created.</p>
            <p className="mt-1">
              Username: <span className="font-mono">{created.username}</span>
            </p>
            <p>
              Temporary password:{" "}
              <span className="font-mono">{created.tempPassword}</span>
            </p>
            <p className="mt-1 text-gray-600">
              Share this with the family now — it won&apos;t be shown again.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 max-w-2xl">
        <h2 className="text-lg font-medium mb-4">All Students</h2>
        {students.length === 0 ? (
          <p className="text-gray-500 text-sm">No students yet.</p>
        ) : (
          <ul className="space-y-2">
            {students.map((s) => (
              <li
                key={s.id}
                className="flex justify-between border-b pb-2 text-sm"
              >
                <span>
                  {s.firstName} {s.lastName}{" "}
                  <span className="text-gray-400">({s.studentCode})</span>
                </span>
                <span className="text-gray-500">
                  {s.enrollments[0]
                    ? `${s.enrollments[0].section.schoolClass.name} — ${s.enrollments[0].section.name}`
                    : "Unassigned"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}