// app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";

type AcademicYear = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
};

type Subject = {
  id: string;
  name: string;
  code: string;
};

type SchoolClass = {
  id: string;
  name: string;
  order: number;
};

type Section = {
  id: string;
  name: string;
  schoolClassId: string;
  schoolClass: SchoolClass;
};

export default function AdminDashboard() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectError, setSubjectError] = useState("");
  const [subjectLoading, setSubjectLoading] = useState(false);

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [className, setClassName] = useState("");
  const [classOrder, setClassOrder] = useState("");
  const [classError, setClassError] = useState("");
  const [classLoading, setClassLoading] = useState(false);

  const [sections, setSections] = useState<Section[]>([]);
  const [sectionName, setSectionName] = useState("");
  const [sectionClassId, setSectionClassId] = useState("");
  const [sectionError, setSectionError] = useState("");
  const [sectionLoading, setSectionLoading] = useState(false);

  const loadYears = async () => {
    const res = await fetch("/api/academic-years");
    const data = await res.json();
    setYears(data);
  };

  const loadSubjects = async () => {
    const res = await fetch("/api/subjects");
    const data = await res.json();
    setSubjects(data);
  };

  const loadClasses = async () => {
    const res = await fetch("/api/classes");
    const data = await res.json();
    setClasses(data);
  };

  const loadSections = async () => {
    const res = await fetch("/api/sections");
    const data = await res.json();
    setSections(data);
  };

  useEffect(() => {
    loadYears();
    loadSubjects();
    loadClasses();
    loadSections();
  }, []);

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

    setLabel("");
    setStartDate("");
    setEndDate("");
    loadYears();
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubjectError("");
    setSubjectLoading(true);

    const res = await fetch("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: subjectName, code: subjectCode }),
    });

    setSubjectLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setSubjectError(data.error ?? "Something went wrong.");
      return;
    }

    setSubjectName("");
    setSubjectCode("");
    loadSubjects();
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setClassError("");
    setClassLoading(true);

    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: className, order: classOrder }),
    });

    setClassLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setClassError(data.error ?? "Something went wrong.");
      return;
    }

    setClassName("");
    setClassOrder("");
    loadClasses();
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSectionError("");
    setSectionLoading(true);

    const res = await fetch("/api/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: sectionName,
        schoolClassId: sectionClassId,
      }),
    });

    setSectionLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setSectionError(data.error ?? "Something went wrong.");
      return;
    }

    setSectionName("");
    loadSections();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-semibold mb-6">Admin Dashboard</h1>

      <div className="bg-white rounded-xl shadow-md p-6 max-w-xl mb-8">
        <h2 className="text-lg font-medium mb-4">Add Academic Year</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Label (e.g. 2026-27)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-rose-500 text-white rounded-lg px-4 py-2 font-medium hover:bg-rose-600 disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add Academic Year"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 max-w-xl">
        <h2 className="text-lg font-medium mb-4">Academic Years</h2>
        {years.length === 0 ? (
          <p className="text-gray-500 text-sm">No academic years yet.</p>
        ) : (
          <ul className="space-y-2">
            {years.map((y) => (
              <li
                key={y.id}
                className="flex justify-between border-b pb-2 text-sm"
              >
                <span>{y.label}</span>
                <span className="text-gray-500">
                  {new Date(y.startDate).toLocaleDateString()} –{" "}
                  {new Date(y.endDate).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 max-w-xl mt-8">
        <h2 className="text-lg font-medium mb-4">Add Subject</h2>
        <form onSubmit={handleCreateSubject} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">
                Name (e.g. Mathematics)
              </label>
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium mb-1">
                Code (e.g. MATH)
              </label>
              <input
                type="text"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
          </div>
          {subjectError && (
            <p className="text-sm text-red-600">{subjectError}</p>
          )}
          <button
            type="submit"
            disabled={subjectLoading}
            className="bg-rose-500 text-white rounded-lg px-4 py-2 font-medium hover:bg-rose-600 disabled:opacity-50"
          >
            {subjectLoading ? "Adding..." : "Add Subject"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 max-w-xl mt-8">
        <h2 className="text-lg font-medium mb-4">Subjects</h2>
        {subjects.length === 0 ? (
          <p className="text-gray-500 text-sm">No subjects yet.</p>
        ) : (
          <ul className="space-y-2">
            {subjects.map((s) => (
              <li
                key={s.id}
                className="flex justify-between border-b pb-2 text-sm"
              >
                <span>{s.name}</span>
                <span className="text-gray-500">{s.code}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 max-w-xl mt-8">
        <h2 className="text-lg font-medium mb-4">Add Class</h2>
        <form onSubmit={handleCreateClass} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">
                Name (e.g. Class 8)
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium mb-1">
                Order (e.g. 8)
              </label>
              <input
                type="number"
                value={classOrder}
                onChange={(e) => setClassOrder(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
          </div>
          {classError && <p className="text-sm text-red-600">{classError}</p>}
          <button
            type="submit"
            disabled={classLoading}
            className="bg-rose-500 text-white rounded-lg px-4 py-2 font-medium hover:bg-rose-600 disabled:opacity-50"
          >
            {classLoading ? "Adding..." : "Add Class"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 max-w-xl mt-8">
        <h2 className="text-lg font-medium mb-4">Classes</h2>
        {classes.length === 0 ? (
          <p className="text-gray-500 text-sm">No classes yet.</p>
        ) : (
          <ul className="space-y-2">
            {classes.map((c) => (
              <li
                key={c.id}
                className="flex justify-between border-b pb-2 text-sm"
              >
                <span>{c.name}</span>
                <span className="text-gray-500">Order: {c.order}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 max-w-xl mt-8">
        <h2 className="text-lg font-medium mb-4">Add Section</h2>
        <form onSubmit={handleCreateSection} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">
                Class
              </label>
              <select
                value={sectionClassId}
                onChange={(e) => setSectionClassId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                required
              >
                <option value="">Select a class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium mb-1">
                Section (e.g. A)
              </label>
              <input
                type="text"
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
          </div>
          {sectionError && (
            <p className="text-sm text-red-600">{sectionError}</p>
          )}
          <button
            type="submit"
            disabled={sectionLoading}
            className="bg-rose-500 text-white rounded-lg px-4 py-2 font-medium hover:bg-rose-600 disabled:opacity-50"
          >
            {sectionLoading ? "Adding..." : "Add Section"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 max-w-xl mt-8">
        <h2 className="text-lg font-medium mb-4">Sections</h2>
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
      </div>
    </div>
  );
}