"use client";

import { useState, useEffect, useCallback } from "react";

type Section = { sectionId: string; label: string };
type Record = {
  id: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
  remarks: string | null;
  student: { firstName: string; lastName: string; studentCode: string };
  markedBy: { username: string };
};
type Summary = { present: number; absent: number; late: number; leave: number; total: number };

function todayLocal() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export default function AttendanceReport({ sections }: { sections: Section[] }) {
  const [sectionId, setSectionId] = useState(sections[0]?.sectionId ?? "");
  const [date, setDate] = useState(todayLocal());
  const [records, setRecords] = useState<Record[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sectionId || !date) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/attendance?sectionId=${sectionId}&date=${date}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load report");
      setRecords(data.records);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
      setRecords([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [sectionId, date]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="bg-white rounded-xl shadow-md p-6 max-w-3xl">
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <div>
          <label className="block text-sm text-gray-500 mb-1">Section</label>
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            {sections.map((s) => (
              <option key={s.sectionId} value={s.sectionId}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-1">Date</label>
          <input
            type="date"
            value={date}
            max={todayLocal()}
            onChange={(e) => setDate(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {summary && (
        <div className="flex gap-4 mb-4 text-sm">
          <span className="text-green-700">Present: {summary.present}</span>
          <span className="text-red-700">Absent: {summary.absent}</span>
          <span className="text-yellow-700">Late: {summary.late}</span>
          <span className="text-blue-700">Leave: {summary.leave}</span>
          <span className="text-gray-500">Total: {summary.total}</span>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : records.length === 0 ? (
        <p className="text-gray-500 text-sm">No attendance marked for this section on this date yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b">
              <th className="py-2">Student</th>
              <th>Status</th>
              <th>Remarks</th>
              <th>Marked By</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="py-2">
                  {r.student.firstName} {r.student.lastName}
                  <span className="text-gray-400 ml-2">{r.student.studentCode}</span>
                </td>
                <td>{r.status}</td>
                <td className="text-gray-500">{r.remarks || "—"}</td>
                <td className="text-gray-500">{r.markedBy.username}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}