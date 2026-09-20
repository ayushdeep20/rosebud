"use client";

import { useState, useEffect, useCallback } from "react";

type Section = { sectionId: string; label: string; academicYearId: string };
type Status = "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
type RosterEntry = {
  studentId: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  rollNumber: number | null;
  status: Status;
  remarks: string;
};

const STATUS_OPTIONS: Status[] = ["PRESENT", "ABSENT", "LATE", "LEAVE"];

const STATUS_STYLES: Record<Status, string> = {
  PRESENT: "bg-green-100 text-green-700 border-green-300",
  ABSENT: "bg-red-100 text-red-700 border-red-300",
  LATE: "bg-yellow-100 text-yellow-700 border-yellow-300",
  LEAVE: "bg-blue-100 text-blue-700 border-blue-300",
};

function todayLocal() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export default function AttendanceMarker({ sections }: { sections: Section[] }) {
  const [sectionId, setSectionId] = useState(sections[0]?.sectionId ?? "");
  const [date, setDate] = useState(todayLocal());
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadRoster = useCallback(async () => {
    if (!sectionId || !date) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/teacher/attendance?sectionId=${sectionId}&date=${date}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load roster");
      setRoster(data.roster);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load roster");
      setRoster([]);
    } finally {
      setLoading(false);
    }
  }, [sectionId, date]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  function setStatus(studentId: string, status: Status) {
    setRoster((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)));
  }

  function setRemarks(studentId: string, remarks: string) {
    setRoster((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, remarks } : r)));
  }

  function markAllPresent() {
    setRoster((prev) => prev.map((r) => ({ ...r, status: "PRESENT" as Status })));
  }

  async function handleSubmit() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/teacher/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId,
          date,
          records: roster.map((r) => ({
            studentId: r.studentId,
            status: r.status,
            remarks: r.remarks,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save attendance");
      setMessage("Attendance saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  }

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
        <button
          onClick={markAllPresent}
          className="text-sm px-3 py-2 border rounded-md text-gray-600 hover:bg-gray-50"
        >
          Mark all Present
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading roster…</p>
      ) : roster.length === 0 ? (
        <p className="text-gray-500 text-sm">No students enrolled in this section.</p>
      ) : (
        <div className="space-y-2">
          {roster.map((r) => (
            <div key={r.studentId} className="flex flex-wrap items-center gap-3 border-b pb-2">
              <div className="w-10 text-sm text-gray-400">{r.rollNumber ?? "-"}</div>
              <div className="flex-1 text-sm font-medium">
                {r.firstName} {r.lastName}
                <span className="text-gray-400 font-normal ml-2">{r.studentCode}</span>
              </div>
              <div className="flex gap-1">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setStatus(r.studentId, opt)}
                    className={`text-xs px-2 py-1 rounded border ${
                      r.status === opt ? STATUS_STYLES[opt] : "bg-white text-gray-400 border-gray-200"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {r.status !== "PRESENT" && (
                <input
                  type="text"
                  placeholder="Remarks (optional)"
                  value={r.remarks}
                  onChange={(e) => setRemarks(r.studentId, e.target.value)}
                  className="border rounded-md px-2 py-1 text-xs w-40"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {message && <p className="text-sm mt-4 text-gray-600">{message}</p>}

      <button
        onClick={handleSubmit}
        disabled={saving || roster.length === 0}
        className="mt-6 bg-rose-600 text-white text-sm px-4 py-2 rounded-md hover:bg-rose-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Attendance"}
      </button>
    </div>
  );
}