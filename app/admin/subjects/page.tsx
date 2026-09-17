// app/admin/subjects/page.tsx
"use client";

import { useEffect, useState } from "react";
import { AdminCard } from "@/components/shared/AdminCard";

type Subject = { id: string; name: string; code: string };

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadSubjects = async () => {
    const res = await fetch("/api/subjects");
    setSubjects(await res.json());
  };

  useEffect(() => { loadSubjects(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, code }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
      return;
    }

    setName(""); setCode("");
    loadSubjects();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 space-y-8">
      <h1 className="text-2xl font-semibold">Subjects</h1>

      <AdminCard title="Add Subject">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Name (e.g. Mathematics)</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2" required />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium mb-1">Code (e.g. MATH)</label>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)}
                className="w-full border rounded-lg px-3 py-2" required />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading}
            className="bg-rose-500 text-white rounded-lg px-4 py-2 font-medium hover:bg-rose-600 disabled:opacity-50">
            {loading ? "Adding..." : "Add Subject"}
          </button>
        </form>
      </AdminCard>

      <AdminCard title="Subjects">
        {subjects.length === 0 ? (
          <p className="text-gray-500 text-sm">No subjects yet.</p>
        ) : (
          <ul className="space-y-2">
            {subjects.map((s) => (
              <li key={s.id} className="flex justify-between border-b pb-2 text-sm">
                <span>{s.name}</span>
                <span className="text-gray-500">{s.code}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}