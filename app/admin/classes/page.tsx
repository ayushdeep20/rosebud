// app/admin/classes/page.tsx
"use client";

import { useEffect, useState } from "react";
import { AdminCard } from "@/components/shared/AdminCard";

type SchoolClass = { id: string; name: string; order: number };

export default function ClassesPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [name, setName] = useState("");
  const [order, setOrder] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadClasses = async () => {
    const res = await fetch("/api/classes");
    setClasses(await res.json());
  };

  useEffect(() => { loadClasses(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, order }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
      return;
    }

    setName(""); setOrder("");
    loadClasses();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 space-y-8">
      <h1 className="text-2xl font-semibold">Classes</h1>

      <AdminCard title="Add Class">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Name (e.g. Class 8)</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2" required />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium mb-1">Order (e.g. 8)</label>
              <input type="number" value={order} onChange={(e) => setOrder(e.target.value)}
                className="w-full border rounded-lg px-3 py-2" required />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading}
            className="bg-rose-500 text-white rounded-lg px-4 py-2 font-medium hover:bg-rose-600 disabled:opacity-50">
            {loading ? "Adding..." : "Add Class"}
          </button>
        </form>
      </AdminCard>

      <AdminCard title="Classes">
        {classes.length === 0 ? (
          <p className="text-gray-500 text-sm">No classes yet.</p>
        ) : (
          <ul className="space-y-2">
            {classes.map((c) => (
              <li key={c.id} className="flex justify-between border-b pb-2 text-sm">
                <span>{c.name}</span>
                <span className="text-gray-500">Order: {c.order}</span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}