// app/admin/students/import/page.tsx
"use client";

import { useEffect, useState } from "react";

type AcademicYear = { id: string; label: string };

type ValidatedRow = {
  rowNumber: number;
  data: {
    firstName?: string;
    lastName?: string;
    admissionNumber?: string;
    className?: string;
    sectionName?: string;
    dateOfBirth?: string;
    gender?: string;
    rollNumber?: string;
  };
  status: "valid" | "invalid";
  reasons: string[];
  sectionId?: string;
};

type CommitResult = {
  rowNumber: number;
  status: "created" | "failed";
  studentCode?: string;
  username?: string;
  tempPassword?: string;
  error?: string;
};

export default function StudentImportPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{
    total: number;
    validCount: number;
    invalidCount: number;
    rows: ValidatedRow[];
  } | null>(null);
  const [commitResults, setCommitResults] = useState<CommitResult[] | null>(
    null
  );

  useEffect(() => {
    fetch("/api/academic-years")
      .then((r) => r.json())
      .then(setYears);
  }, []);

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setError("");
    setPreview(null);
    setCommitResults(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/students/import/preview", {
      method: "POST",
      body: formData,
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
      return;
    }

    setPreview(await res.json());
  };

  const handleConfirm = async () => {
    if (!preview || !academicYearId) return;

    setCommitting(true);
    setError("");

    const validRows = preview.rows.filter((r) => r.status === "valid");

    const res = await fetch("/api/students/import/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ academicYearId, rows: validRows }),
    });

    setCommitting(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
      return;
    }

    const data = await res.json();
    setCommitResults(data.results);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-semibold mb-6">Bulk Student Import</h1>

      <div className="bg-white rounded-xl shadow-md p-6 max-w-3xl mb-8">
        <p className="text-sm text-gray-600 mb-4">
          Upload an Excel file with columns: firstName, lastName,
          dateOfBirth, gender, admissionNumber, className, sectionName,
          rollNumber. Class and Section must already exist in Admin.
        </p>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Academic Year for this import
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
        <form onSubmit={handlePreview} className="flex items-center gap-4">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <button
            type="submit"
            disabled={!file || loading}
            className="bg-rose-500 text-white rounded-lg px-4 py-2 font-medium hover:bg-rose-600 disabled:opacity-50"
          >
            {loading ? "Reading file..." : "Preview"}
          </button>
        </form>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      </div>

      {preview && !commitResults && (
        <div className="bg-white rounded-xl shadow-md p-6 max-w-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-6 text-sm">
              <span>Total rows: {preview.total}</span>
              <span className="text-green-700">
                Valid: {preview.validCount}
              </span>
              <span className="text-red-700">
                Invalid: {preview.invalidCount}
              </span>
            </div>
            <button
              onClick={handleConfirm}
              disabled={
                preview.validCount === 0 || !academicYearId || committing
              }
              className="bg-green-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {committing
                ? "Creating students..."
                : `Import ${preview.validCount} Valid Row(s)`}
            </button>
          </div>
          {!academicYearId && (
            <p className="text-sm text-amber-600 mb-3">
              Select an Academic Year above before importing.
            </p>
          )}
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="pb-2">Row</th>
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Adm. No.</th>
                  <th className="pb-2">Class</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.rowNumber} className="border-b">
                    <td className="py-1">{r.rowNumber}</td>
                    <td className="py-1">
                      {r.data.firstName} {r.data.lastName}
                    </td>
                    <td className="py-1">{r.data.admissionNumber}</td>
                    <td className="py-1">
                      {r.data.className} — {r.data.sectionName}
                    </td>
                    <td className="py-1">
                      {r.status === "valid" ? (
                        <span className="text-green-700">✅ Valid</span>
                      ) : (
                        <span className="text-red-700">
                          ⚠️ {r.reasons.join("; ")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {commitResults && (
        <div className="bg-white rounded-xl shadow-md p-6 max-w-3xl">
          <h2 className="text-lg font-medium mb-4">Import Complete</h2>
          <p className="text-sm text-gray-600 mb-4">
            {commitResults.filter((r) => r.status === "created").length}{" "}
            students created,{" "}
            {commitResults.filter((r) => r.status === "failed").length}{" "}
            failed. Copy these credentials now — they won&apos;t be shown
            again.
          </p>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="pb-2">Row</th>
                  <th className="pb-2">Student ID</th>
                  <th className="pb-2">Username</th>
                  <th className="pb-2">Temp Password</th>
                </tr>
              </thead>
              <tbody>
                {commitResults.map((r) => (
                  <tr key={r.rowNumber} className="border-b">
                    <td className="py-1">{r.rowNumber}</td>
                    {r.status === "created" ? (
                      <>
                        <td className="py-1 font-mono">{r.studentCode}</td>
                        <td className="py-1 font-mono">{r.username}</td>
                        <td className="py-1 font-mono">{r.tempPassword}</td>
                      </>
                    ) : (
                      <td colSpan={3} className="py-1 text-red-700">
                        Failed: {r.error}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}