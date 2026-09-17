// app/admin/academic-years/page.tsx
"use client";

import { useEffect, useState } from "react";
import { AdminCard } from "@/components/shared/AdminCard";

type AcademicYear = { id: string; label: string; startDate: string; endDate: string; isCurrent: boolean };

export default function AcademicYearsPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadYears = async () => {
    const res = await fetch("/api/academic-years");
    setYears(await res.json());
  };

  useEffect(() => { loadYears(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/academic-years", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, startDate, endDate }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
      return;
    }

    setLabel(""); setStartDate(""); setEndDate("");
    loadYears();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 space-y-8">
      <h1 className="text-2xl font-semibold">Academic Years</h1>

      <AdminCard title="Add Academic Year">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Label (e.g. 2026-27)</label>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
              className="w-full border rounded-lg px-3 py-2" required />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2" required />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2" required />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading}
            className="bg-rose-500 text-white rounded-lg px-4 py-2 font-medium hover:bg-rose-600 disabled:opacity-50">
            {loading ? "Adding..." : "Add Academic Year"}
          </button>
        </form>
      </AdminCard>

      <AdminCard title="Academic Years">
        {years.length === 0 ? (
          <p className="text-gray-500 text-sm">No academic years yet.</p>
        ) : (
          <ul className="space-y-2">
            {years.map((y) => (
              <li key={y.id} className="flex justify-between border-b pb-2 text-sm">
                <span>{y.label}</span>
                <span className="text-gray-500">
                  {new Date(y.startDate).toLocaleDateString()} – {new Date(y.endDate).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}