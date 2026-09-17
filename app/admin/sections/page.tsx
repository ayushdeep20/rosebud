// app/admin/sections/page.tsx
"use client";

import { useEffect, useState } from "react";
import { AdminCard } from "@/components/shared/AdminCard";

type SchoolClass = { id: string; name: string; order: number };
type Section = { id: string; name: string; schoolClassId: string; schoolClass: SchoolClass };

export default function SectionsPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [name, setName] = useState("");
  const [schoolClassId, setSchoolClassId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadAll = async () => {
    const [c, s] = await Promise.all([
      fetch("/api/classes").then((r) => r.json()),
      fetch("/api/sections").then((r) => r.json()),
    ]);
    setClasses(c);
    setSections(s);
  };

  useEffect(() => { loadAll(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, schoolClassId }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
      return;
    }

    setName("");
    loadAll();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 space-y-8">
      <h1 className="text-2xl font-semibold">Sections</h1>

      <AdminCard title="Add Section">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Class</label>
              <select value={schoolClassId} onChange={(e) => setSchoolClassId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2" required>
                <option value="">Select a class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium mb-1">Section (e.g. A)</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2" required />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading}
            className="bg-rose-500 text-white rounded-lg px-4 py-2 font-medium hover:bg-rose-600 disabled:opacity-50">
            {loading ? "Adding..." : "Add Section"}
          </button>
        </form>
      </AdminCard>

      <AdminCard title="Sections">
        {sections.length === 0 ? (
          <p className="text-gray-500 text-sm">No sections yet.</p>
        ) : (
          <ul className="space-y-2">
            {sections.map((s) => (
              <li key={s.id} className="border-b pb-2 text-sm">
                {s.schoolClass.name} — Section {s.name}
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}