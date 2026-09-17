// app/admin/students/import/page.tsx
"use client";

import { useState } from "react";

type ValidatedRow = {
  rowNumber: number;
  data: {
    firstName?: string;
    lastName?: string;
    admissionNumber?: string;
    className?: string;
    sectionName?: string;
  };
  status: "valid" | "invalid";
  reasons: string[];
};

export default function StudentImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    total: number;
    validCount: number;
    invalidCount: number;
    rows: ValidatedRow[];
  } | null>(null);

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setError("");
    setResult(null);
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

    setResult(await res.json());
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

      {result && (
        <div className="bg-white rounded-xl shadow-md p-6 max-w-3xl">
          <div className="flex gap-6 mb-4 text-sm">
            <span>Total rows: {result.total}</span>
            <span className="text-green-700">Valid: {result.validCount}</span>
            <span className="text-red-700">
              Invalid: {result.invalidCount}
            </span>
          </div>
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
                {result.rows.map((r) => (
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
    </div>
  );
}