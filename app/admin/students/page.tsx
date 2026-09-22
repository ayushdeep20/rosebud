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
  hostelFacility: boolean;
  busFacility: boolean;
  busNo: string | null;
  busPoint: string | null;
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

  // Boarding & transport - "Day Scholar" is the default for new admissions.
  const [isBoarder, setIsBoarder] = useState(false);
  const [usesBus, setUsesBus] = useState(false);
  const [busNo, setBusNo] = useState("");
  const [busPoint, setBusPoint] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{
    username: string;
    tempPassword: string;
  } | null>(null);

  // studentId -> true while a row's toggle request is in flight
  const [savingRow, setSavingRow] = useState<Record<string, boolean>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});

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
        hostelFacility: isBoarder,
        busFacility: usesBus,
        busNo: usesBus ? busNo : null,
        busPoint: usesBus ? busPoint : null,
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
    setIsBoarder(false);
    setUsesBus(false);
    setBusNo("");
    setBusPoint("");
    loadAll();
  };

  // Flip a student's boarding status. Turning boarding ON always turns
  // bus OFF too (a boarder doesn't pay separate transport), matching
  // the rule the backend also enforces.
  const setRowBoarding = async (student: StudentRow, hostelFacility: boolean) => {
    await patchStudent(student.id, {
      hostelFacility,
      ...(hostelFacility ? { busFacility: false } : {}),
    });
  };

  const setRowBus = async (student: StudentRow, busFacility: boolean) => {
    await patchStudent(student.id, { busFacility });
  };

  const patchStudent = async (
    studentId: string,
    update: { hostelFacility?: boolean; busFacility?: boolean; busNo?: string | null; busPoint?: string | null }
  ) => {
    setSavingRow((prev) => ({ ...prev, [studentId]: true }));
    setRowError((prev) => ({ ...prev, [studentId]: "" }));
    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update this student.");

      setStudents((prev) =>
        prev.map((s) =>
          s.id === studentId
            ? {
                ...s,
                hostelFacility: data.student.hostelFacility,
                busFacility: data.student.busFacility,
                busNo: data.student.busNo,
                busPoint: data.student.busPoint,
              }
            : s
        )
      );
    } catch (err) {
      setRowError((prev) => ({
        ...prev,
        [studentId]: err instanceof Error ? err.message : "Could not update this student.",
      }));
    } finally {
      setSavingRow((prev) => ({ ...prev, [studentId]: false }));
    }
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

          <div className="border-t pt-4">
            <label className="block text-sm font-medium mb-2">
              Boarding
            </label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="boarding"
                  checked={!isBoarder}
                  onChange={() => setIsBoarder(false)}
                />
                Day Scholar
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="boarding"
                  checked={isBoarder}
                  onChange={() => {
                    setIsBoarder(true);
                    setUsesBus(false); // a boarder doesn't pay separate transport
                  }}
                />
                Boarder (Hostel)
              </label>
            </div>
          </div>

          {!isBoarder && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <input
                  type="checkbox"
                  checked={usesBus}
                  onChange={(e) => setUsesBus(e.target.checked)}
                />
                Uses school bus
              </label>
              {usesBus && (
                <div className="flex gap-4 pl-6">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1">Bus No.</label>
                    <input
                      type="text"
                      value={busNo}
                      onChange={(e) => setBusNo(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1">Bus Point</label>
                    <input
                      type="text"
                      value={busPoint}
                      onChange={(e) => setBusPoint(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

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

      <div className="bg-white rounded-xl shadow-md p-6 max-w-4xl">
        <h2 className="text-lg font-medium mb-1">All Students</h2>
        <p className="text-xs text-gray-500 mb-4">
          Boarding and Bus can be changed any time a student&apos;s status changes — it only
          affects fees generated from that point on.
        </p>
        {students.length === 0 ? (
          <p className="text-gray-500 text-sm">No students yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-2 font-medium">Student</th>
                <th className="py-2 pr-2 font-medium">Class</th>
                <th className="py-2 pr-2 font-medium">Boarding</th>
                <th className="py-2 pr-2 font-medium">Bus</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const saving = !!savingRow[s.id];
                return (
                  <tr key={s.id} className="border-b last:border-0 align-top">
                    <td className="py-2 pr-2">
                      {s.firstName} {s.lastName}{" "}
                      <span className="text-gray-400">({s.studentCode})</span>
                      {rowError[s.id] && (
                        <p className="text-xs text-red-600 mt-1">{rowError[s.id]}</p>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-gray-500">
                      {s.enrollments[0]
                        ? `${s.enrollments[0].section.schoolClass.name} — ${s.enrollments[0].section.name}`
                        : "Unassigned"}
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        value={s.hostelFacility ? "boarder" : "day"}
                        disabled={saving}
                        onChange={(e) => setRowBoarding(s, e.target.value === "boarder")}
                        className="border rounded px-2 py-1 text-sm disabled:opacity-50"
                      >
                        <option value="day">Day Scholar</option>
                        <option value="boarder">Boarder</option>
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <label
                        className={
                          "flex items-center gap-1 text-sm " +
                          (s.hostelFacility ? "text-gray-300" : "")
                        }
                      >
                        <input
                          type="checkbox"
                          checked={s.busFacility}
                          disabled={saving || s.hostelFacility}
                          onChange={(e) => setRowBus(s, e.target.checked)}
                        />
                        Uses bus
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
