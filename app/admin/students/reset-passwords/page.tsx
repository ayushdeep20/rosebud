// app/admin/students/reset-passwords/page.tsx
"use client";

import { useEffect, useState } from "react";

type AcademicYear = { id: string; label: string };
type ResetResult = {
  studentCode: string;
  username: string;
  tempPassword: string;
};

export default function ResetPasswordsPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResetResult[] | null>(null);

  useEffect(() => {
    fetch("/api/academic-years")
      .then((r) => r.json())
      .then(setYears);
  }, []);

  const handleReset = async () => {
    if (!academicYearId) return;
    if (
      !confirm(
        "This will reset the password for EVERY student enrolled in this academic year. Continue?"
      )
    ) {
      return;
    }

    setLoading(true);
    setResults(null);

    const res = await fetch("/api/students/reset-passwords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ academicYearId }),
    });

    setLoading(false);

    if (res.ok) {
      const data = await res.json();
      setResults(data.results);
    }
  };

  const downloadCsv = () => {
    if (!results) return;
    const header = "studentCode,username,tempPassword\n";
    const rows = results
      .map((r) => `${r.studentCode},${r.username},${r.tempPassword}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student-credentials.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-semibold mb-6">
        Bulk Password Reset / Recovery
      </h1>

      <div className="bg-white rounded-xl shadow-md p-6 max-w-2xl mb-8">
        <p className="text-sm text-gray-600 mb-4">
          Use this to regenerate login credentials for every student in an
          academic year — e.g. if a credentials list was lost after import.
        </p>
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">
              Academic Year
            </label>
            <select
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              <option value="">Select year</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleReset}
            disabled={!academicYearId || loading}
            className="bg-rose-500 text-white rounded-lg px-4 py-2 font-medium hover:bg-rose-600 disabled:opacity-50"
          >
            {loading ? "Resetting..." : "Reset All Passwords"}
          </button>
        </div>
      </div>

      {results && (
        <div className="bg-white rounded-xl shadow-md p-6 max-w-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">
              {results.length} credentials generated
            </h2>
            <button
              onClick={downloadCsv}
              className="bg-green-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-green-700"
            >
              Download CSV
            </button>
          </div>
          <p className="text-sm text-amber-600 mb-3">
            Save this list now — it will not be shown again.
          </p>
          <div className="max-h-96 overflow-y-auto text-sm font-mono">
            {results.map((r) => (
              <div key={r.studentCode} className="border-b py-1">
                {r.studentCode} — {r.username} — {r.tempPassword}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}