// app/admin/fees/import/page.tsx

"use client";

import { useState, useEffect } from "react";

type AcademicYear = {
  id: string;
  label: string;
  isCurrent: boolean;
};

export default function ImportOpeningBalancesPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState("");

  useEffect(() => {
    async function fetchYears() {
      try {
        const res = await fetch("/api/academic-years");
        if (res.ok) {
          const data = await res.json();
          setAcademicYears(data);
          const current = data.find((y: AcademicYear) => y.isCurrent);
          if (current) setAcademicYearId(current.id);
          else if (data.length > 0) setAcademicYearId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch academic years", err);
      }
    }
    void fetchYears();
  }, []);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!academicYearId || !rawText) {
      alert("Please select an academic year and provide records.");
      return;
    }

    setLoading(true);
    setResultMessage("");

    try {
      // Parse tab-separated or comma-separated rows (Adm No \t Dues)
      const lines = rawText.split("\n");
      const records = [];

      for (const line of lines) {
        if (!line.trim()) continue;
        // Supports CSV or TSV (Admission Number, Dues)
        const parts = line.split(/[\t,]/);
        if (parts.length >= 2) {
          const admissionNumber = parts[0].trim();
          // Remove commas and currency symbols from amount string
          const dues = parseFloat(parts[1].replace(/,/g, "").trim());
          if (admissionNumber && !isNaN(dues)) {
            records.push({ admissionNumber, dues });
          }
        }
      }

      if (records.length === 0) {
        throw new Error("No valid records found. Make sure format is AdmissionNumber, Dues per line.");
      }

            const importRes = await fetch("/api/fees/import-openings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ academicYearId, records }),
      });

      const data = await importRes.json();
      if (!importRes.ok) throw new Error(data.error || "Import failed");

      setResultMessage(data.message);
    } catch (err) {
      console.error("Import error:", err);
      alert(err instanceof Error ? err.message : "Failed to import records.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Import Opening Balances (Defaulters List)</h1>
        <p className="text-sm text-gray-500">Paste rows from your converted Excel sheet to seed prior backlogs into the FIFO ledger.</p>
      </div>

      <form onSubmit={handleImport} className="space-y-6 rounded-xl bg-white p-6 shadow-sm border border-gray-100">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Academic Year</label>
          <select
            value={academicYearId}
            onChange={(e) => setAcademicYearId(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-rose-500"
          >
            <option value="">-- Choose Academic Year --</option>
            {academicYears.map((year) => (
              <option key={year.id} value={year.id}>
                {year.label} {year.isCurrent ? "(Current)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Paste Data (Format: <code className="text-rose-600 bg-rose-50 px-1 rounded">AdmissionNo, Dues</code>)
          </label>
          <p className="text-xs text-gray-400 mb-2">Example: 1846, 3800.00</p>
          <textarea
            rows={10}
            required
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="1846	3800.00&#10;2571	1900.00&#10;2041	6400.00"
            className="w-full rounded-lg border p-3 font-mono text-sm outline-none focus:border-rose-500"
          />
        </div>

        {resultMessage && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 font-medium">
            {resultMessage}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-rose-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50 transition"
          >
            {loading ? "Importing Records..." : "Process Opening Balances"}
          </button>
        </div>
      </form>
    </div>
  );
}