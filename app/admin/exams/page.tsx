// app/admin/exams/page.tsx
"use client";

import { useEffect, useState } from "react";

type AcademicYear = { id: string; label: string };
type SchoolClass = { id: string; name: string };
type ExamGroup = {
  type: string;
  name: string;
  academicYearLabel: string;
  schoolClassName: string;
  sectionCount: number;
};

export default function ExamsPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [exams, setExams] = useState<ExamGroup[]>([]);

  const [type, setType] = useState("HALF_YEARLY");
  const [academicYearId, setAcademicYearId] = useState("");
  const [schoolClassId, setSchoolClassId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadAll = async () => {
    const [y, c, e] = await Promise.all([
      fetch("/api/academic-years").then((r) => r.json()),
      fetch("/api/classes").then((r) => r.json()),
      fetch("/api/exams").then((r) => r.json()),
    ]);
    setYears(y);
    setClasses(c);
    setExams(e);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, academicYearId, schoolClassId }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
      return;
    }

    setSchoolClassId("");
    loadAll();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-semibold mb-6">Exams</h1>

      <div className="bg-white rounded-xl shadow-md p-6 max-w-xl mb-8">
        <h2 className="text-lg font-medium mb-4">Create Exam</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Exam Type
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="type"
                  value="HALF_YEARLY"
                  checked={type === "HALF_YEARLY"}
                  onChange={(e) => setType(e.target.value)}
                />
                Half Yearly
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="type"
                  value="ANNUAL"
                  checked={type === "ANNUAL"}
                  onChange={(e) => setType(e.target.value)}
                />
                Annual
              </label>
            </div>
          </div>

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
            <label className="block text-sm font-medium mb-1">Class</label>
            <select
              value={schoolClassId}
              onChange={(e) => setSchoolClassId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              required
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-rose-500 text-white rounded-lg px-4 py-2 font-medium hover:bg-rose-600 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Exam"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 max-w-xl">
        <h2 className="text-lg font-medium mb-4">Existing Exams</h2>
        {exams.length === 0 ? (
          <p className="text-gray-500 text-sm">No exams created yet.</p>
        ) : (
          <ul className="space-y-2">
            {exams.map((ex, i) => (
              <li
                key={i}
                className="flex justify-between items-center border-b pb-2 text-sm"
              >
                <span>
                  {ex.name} — {ex.academicYearLabel} — {ex.schoolClassName}
                </span>
                <button
                  disabled
                  title="Report card generation comes in a later step"
                  className="text-gray-400 text-xs border rounded px-2 py-1 cursor-not-allowed"
                >
                  View Report Cards
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}