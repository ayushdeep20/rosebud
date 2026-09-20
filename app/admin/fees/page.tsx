// app/admin/fees/page.tsx

"use client";

import { useState, useEffect } from "react";

type AcademicYear = {
  id: string;
  label: string;
  isCurrent: boolean;
};

type Section = {
  id: string;
  name: string;
  schoolClass?: {
    name: string;
  };
  class?: {
    name: string;
  };
};

type StudentSummary = {
  studentId: string;
  name: string;
  rollNumber: number | null;
  isHosteler: boolean;
  pendingTotal: number;
  monthsPending: number;
};

export default function AdminFeesDashboard() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  
  const [academicYearId, setAcademicYearId] = useState("");
  const [sectionId, setSectionId] = useState("");
  
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal State for Payment Collection
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [processing, setProcessing] = useState(false);

  // Modal State for Defaulters Import
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  useEffect(() => {
    async function fetchMetadata() {
      try {
        const [yearsRes, sectionsRes] = await Promise.all([
          fetch("/api/academic-years"),
          fetch("/api/sections"),
        ]);

        if (yearsRes.ok) {
          const yearsData = await yearsRes.json();
          setAcademicYears(yearsData);
          const current = yearsData.find((y: AcademicYear) => y.isCurrent);
          if (current) setAcademicYearId(current.id);
          else if (yearsData.length > 0) setAcademicYearId(yearsData[0].id);
        }

        if (sectionsRes.ok) {
          const sectionsData = await sectionsRes.json();
          setSections(sectionsData);
        }
      } catch (err) {
        console.error("Failed to load filter metadata", err);
      }
    }

    void fetchMetadata();
  }, []);

  const fetchStudents = async () => {
    if (!sectionId || !academicYearId) {
      alert("Please select both an Academic Year and a Section.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/fees/summary?sectionId=${sectionId}&academicYearId=${academicYearId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch summaries.");
      setStudents(data);
    } catch (err) {
      console.error("Failed to load student dues:", err);
      alert("Could not load fee dues for this section.");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !paymentAmount) return;

    setProcessing(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.studentId,
          academicYearId,
          amount: parseFloat(paymentAmount),
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment failed");

      alert("Payment processed and allocated successfully!");
      setSelectedStudent(null);
      setPaymentAmount("");
      await fetchStudents();
    } catch (error) {
      console.error("Payment submission error:", error);
      alert(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setProcessing(false);
    }
  };

  const handleImportExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!academicYearId || !selectedFile) {
      alert("Please select an academic year and attach your Excel file.");
      return;
    }

    setImporting(true);
    setImportMessage("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("academicYearId", academicYearId);

      const res = await fetch("/api/fees/import-excel", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      setImportMessage(data.message);
      setSelectedFile(null);
      if (sectionId) {
        await fetchStudents();
      }
    } catch (err) {
      console.error("Import error:", err);
      alert(err instanceof Error ? err.message : "Failed to import Excel file.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Fee Collection Dashboard</h1>
          <p className="text-sm text-gray-500">Manage student dues, hostel fees, and record FIFO payments.</p>
        </div>
        <button
          onClick={() => setShowImportModal(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition shadow-sm"
        >
          📥 Import Defaulters Excel
        </button>
      </div>

      {/* Filters Box */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl bg-white p-6 shadow-sm border border-gray-100">
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
          <label className="mb-1 block text-sm font-medium text-gray-700">Class & Section</label>
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-rose-500"
          >
            <option value="">-- Choose Section --</option>
            {sections.map((sec) => {
              const className = sec.schoolClass?.name || sec.class?.name || "Class";
              return (
                <option key={sec.id} value={sec.id}>
                  {className} — {sec.name}
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={fetchStudents}
            className="w-full rounded-lg bg-rose-600 px-6 py-2 text-sm font-medium text-white hover:bg-rose-700 transition"
          >
            Load Student Dues
          </button>
        </div>
      </div>

      {/* Roster Table */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600 border-b">
            <tr>
              <th className="px-6 py-4 font-medium">Roll No</th>
              <th className="px-6 py-4 font-medium">Student Name</th>
              <th className="px-6 py-4 font-medium">Facility</th>
              <th className="px-6 py-4 font-medium">Pending Dues</th>
              <th className="px-6 py-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">Loading student fee status...</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">Select a section and click &quot;Load Student Dues&quot; to begin.</td></tr>
            ) : (
              students.map((student) => (
                <tr key={student.studentId} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-gray-600">{student.rollNumber || "-"}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{student.name}</td>
                  <td className="px-6 py-4">
                    {student.isHosteler && (
                      <span className="rounded bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 border border-indigo-100">
                        Hostel Boarder
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {student.pendingTotal > 0 ? (
                      <div className="flex flex-col">
                        <span className="font-bold text-rose-600">₹{student.pendingTotal}</span>
                        <span className="text-xs text-gray-500">{student.monthsPending} active due record(s)</span>
                      </div>
                    ) : (
                      <span className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded text-xs">
                        Fully Cleared
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      disabled={student.pendingTotal === 0}
                      onClick={() => setSelectedStudent(student)}
                      className="rounded bg-emerald-600 px-4 py-1.5 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Collect Payment
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Import Defaulters Excel Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-1 text-lg font-bold text-gray-900">Import Defaulters Excel File</h2>
            <p className="mb-4 text-xs text-gray-500">
              Upload your Excel sheet (<code className="bg-gray-100 px-1 rounded">defaulters_list.xlsx</code>). The system will match students by Admission Number and seed opening balances as top-priority FIFO debts.
            </p>

            <form onSubmit={handleImportExcel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Select Excel File (.xlsx)</label>
                <input
                  type="file"
                  required
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border p-2 text-xs text-gray-600 file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              {importMessage && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-medium">
                  {importMessage}
                </div>
              )}

              <div className="mt-6 flex gap-3 justify-end pt-2 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportMessage("");
                    setSelectedFile(null);
                  }}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {importing ? "Importing..." : "Upload & Process"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-1 text-lg font-bold text-gray-900">Accept Fee Payment</h2>
            <p className="mb-6 text-xs text-gray-500">
              Processing payment for <strong className="text-gray-800">{selectedStudent.name}</strong>. Total Outstanding: <span className="text-rose-600 font-bold">₹{selectedStudent.pendingTotal}</span>
            </p>

            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Amount Received (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedStudent.pendingTotal}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-rose-500"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Payment will automatically clear the oldest pending months first (FIFO).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-rose-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div className="mt-6 flex gap-3 justify-end pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="rounded-lg bg-rose-600 px-5 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50 transition"
                >
                  {processing ? "Processing..." : "Confirm & Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}