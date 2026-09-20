"use client";

import { useCallback, useEffect, useState } from "react";

type AcademicYear = { id: string; label: string };
type Subject = { id: string; name: string; code: string };
type SchoolClass = { id: string; name: string };
type Section = { id: string; name: string; schoolClass: SchoolClass };

type UnitTest = {
  id: string;
  name: string;
  totalMarks: number | null;
  subject: { name: string };
  section: { name: string; schoolClass: { name: string } };
  academicYear: { label: string };
};

type InvalidRow = { rowNumber: number; reason?: string };
type ApiErrorResponse = { error?: string };
type UploadSuccessResponse = { saved: number };
type CreateUnitTestResponse = UnitTest & { id: string };

export default function UnitTestsPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [unitTests, setUnitTests] = useState<UnitTest[]>([]);

  const [academicYearId, setAcademicYearId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [name, setName] = useState("");
  const [totalMarks, setTotalMarks] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [uploadFiles, setUploadFiles] = useState<Record<string, File | null>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [uploadInvalidRows, setUploadInvalidRows] = useState<Record<string, InvalidRow[]>>({});
  const [uploadSuccess, setUploadSuccess] = useState<Record<string, string>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const [loadingPage, setLoadingPage] = useState(true);

  const loadAll = useCallback(async () => {
    setLoadingPage(true);
    try {
      const [yearsRes, subjectsRes, sectionsRes, unitTestsRes] = await Promise.all([
        fetch("/api/academic-years"),
        fetch("/api/subjects"),
        fetch("/api/sections"),
        fetch("/api/unit-tests"),
      ]);

      const [yearsData, subjectsData, sectionsData, unitTestsData] = await Promise.all([
        yearsRes.json(),
        subjectsRes.json(),
        sectionsRes.json(),
        unitTestsRes.json(),
      ]);

      if (!yearsRes.ok) throw new Error(yearsData.error ?? "Failed to load academic years.");
      if (!subjectsRes.ok) throw new Error(subjectsData.error ?? "Failed to load subjects.");
      if (!sectionsRes.ok) throw new Error(sectionsData.error ?? "Failed to load sections.");
      if (!unitTestsRes.ok) throw new Error(unitTestsData.error ?? "Failed to load unit tests.");

      setYears(yearsData as AcademicYear[]);
      setSubjects(subjectsData as Subject[]);
      setSections(sectionsData as Section[]);
      setUnitTests(unitTestsData as UnitTest[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Unit Tests data.");
    } finally {
      setLoadingPage(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/unit-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ academicYearId, subjectId, sectionId, name, totalMarks }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong while creating the Unit Test.");
        return;
      }

      setName("");
      setTotalMarks("");
      await loadAll();
      window.location.href = `/api/unit-tests/${data.id}/template`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while creating.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (examId: string) => {
    const file = uploadFiles[examId];
    if (!file) return;

    setUploadingId(examId);
    setUploadErrors((prev) => ({ ...prev, [examId]: "" }));
    setUploadInvalidRows((prev) => ({ ...prev, [examId]: [] }));
    setUploadSuccess((prev) => ({ ...prev, [examId]: "" }));

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/unit-tests/${examId}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadErrors((prev) => ({
          ...prev,
          [examId]: data.error ?? "Upload failed.",
        }));
        setUploadInvalidRows((prev) => ({
          ...prev,
          [examId]: data.invalidRows ?? [],
        }));
        return;
      }

      setUploadSuccess((prev) => ({
        ...prev,
        [examId]: `Saved marks for ${data.saved} student(s).`,
      }));

      // Clear the file state
      setUploadFiles((prev) => ({ ...prev, [examId]: null }));
      
      // Reset the visual DOM input to say "No file chosen" again after success
      const fileInput = document.getElementById(`fileInput-${examId}`) as HTMLInputElement;
      if (fileInput) fileInput.value = "";

    } catch (err) {
      setUploadErrors((prev) => ({
        ...prev,
        [examId]: err instanceof Error ? err.message : "Upload failed.",
      }));
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="mb-6 text-2xl font-semibold">Unit Tests</h1>

      {/* Create Unit Test */}
      <div className="mb-8 max-w-xl rounded-xl bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-medium">Create Unit Test</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Academic Year</label>
            <select
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
              required
            >
              <option value="">Select year</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>{year.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">Subject</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
                required
              >
                <option value="">Select subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">Section</label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
                required
              >
                <option value="">Select section</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.schoolClass.name} — {section.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Test Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Unit Test — 22 Sept"
              className="w-full rounded-lg border px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Total Marks</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={totalMarks}
              onChange={(e) => setTotalMarks(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
              required
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-rose-500 px-4 py-2 font-medium text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create & Get Excel Template"}
          </button>
        </form>
      </div>

      {/* Unit Test List */}
      <div className="max-w-xl rounded-xl bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-medium">Your Unit Tests</h2>
        {loadingPage ? (
          <p className="text-sm text-gray-500">Loading unit tests...</p>
        ) : unitTests.length === 0 ? (
          <p className="text-sm text-gray-500">No unit tests created yet.</p>
        ) : (
          <ul className="space-y-4">
            {unitTests.map((ut) => {
              const currentFile = uploadFiles[ut.id];
              const isUploading = uploadingId === ut.id;
              
              // Only true if a valid file exists in state
              const hasFile = Boolean(currentFile);

              return (
                <li key={ut.id} className="border-b pb-4 text-sm last:border-b-0">
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <span className="leading-6">
                      <span className="font-medium">{ut.subject.name}</span> —{" "}
                      {ut.section.schoolClass.name} — {ut.section.name} — {ut.name}{" "}
                      (Total: {ut.totalMarks})
                    </span>
                    <a
                      href={`/api/unit-tests/${ut.id}/template`}
                      className="shrink-0 text-xs text-rose-600 underline"
                    >
                      Download Template
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id={`fileInput-${ut.id}`}
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={(e) => {
                        const selectedFile = e.target.files?.[0] || null;
                        setUploadFiles((prev) => ({ ...prev, [ut.id]: selectedFile }));
                        setUploadErrors((prev) => ({ ...prev, [ut.id]: "" }));
                        setUploadInvalidRows((prev) => ({ ...prev, [ut.id]: [] }));
                        setUploadSuccess((prev) => ({ ...prev, [ut.id]: "" }));
                      }}
                      className="min-w-0 flex-1 text-xs"
                    />

                    <button
                      type="button"
                      onClick={() => void handleUpload(ut.id)}
                      disabled={isUploading || !hasFile}
                      className="shrink-0 rounded bg-gray-800 px-3 py-1 text-xs text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isUploading ? "Uploading..." : "Upload"}
                    </button>
                  </div>

                  {uploadErrors[ut.id] && (
                    <div className="mt-2 text-xs text-red-600">
                      <p className="font-medium">{uploadErrors[ut.id]}</p>
                      {uploadInvalidRows[ut.id]?.length > 0 && (
                        <ul className="mt-1 list-inside list-disc">
                          {uploadInvalidRows[ut.id].map((row, index) => (
                            <li key={`${ut.id}-${index}`}>
                              Row {row.rowNumber}: {row.reason ?? "Invalid row"}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {uploadSuccess[ut.id] && (
                    <p className="mt-2 text-xs text-green-600">{uploadSuccess[ut.id]}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}