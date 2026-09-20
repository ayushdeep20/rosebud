"use client";

import { useState, useEffect } from "react";

type StudentSummary = {
  studentId: string;
  name: string;
  rollNumber: number | null;
  isHosteler: boolean;
  pendingTotal: number;
  monthsPending: number;
};

export default function AdminFeesDashboard() {
  const [academicYearId, setAcademicYearId] = useState(""); 
  const [sectionId, setSectionId] = useState(""); 
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [processing, setProcessing] = useState(false);

  // In a real app, you would fetch years and sections from your API
  // Hardcoded for demonstration of the fee flow
  useEffect(() => {
    setAcademicYearId("cm19xyz_dummy_year_id"); // Replace with actual current year ID state
  }, []);

  const fetchStudents = async () => {
    if (!sectionId || !academicYearId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/fees/summary?sectionId=${sectionId}&academicYearId=${academicYearId}`);
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      console.error("Failed to load students", err);
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

      if (res.ok) {
        alert("Payment processed successfully!");
        setSelectedStudent(null);
        setPaymentAmount("");
        fetchStudents(); // Refresh the list to show updated totals
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Payment failed");
      }
    } catch (error) {
      console.error("Payment submission error:", error);
      alert("An error occurred");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="mb-6 text-2xl font-semibold text-gray-800">Fee Collection</h1>

      {/* Class Selection */}
      <div className="mb-8 flex items-end gap-4 rounded-xl bg-white p-6 shadow-sm">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-700">Select Section</label>
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="">-- Choose Section --</option>
            {/* Map your actual sections here */}
            <option value="cm19abc_dummy_section_id">Class 10 — A</option>
          </select>
        </div>
        <button
          onClick={fetchStudents}
          className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-700"
        >
          View Dues
        </button>
      </div>

      {/* Dues Roster */}
      <div className="rounded-xl bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600">
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
              <tr><td colSpan={5} className="p-6 text-center text-gray-500">Loading...</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-gray-500">Select a section to view dues.</td></tr>
            ) : (
              students.map((student) => (
                <tr key={student.studentId} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{student.rollNumber || "-"}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{student.name}</td>
                  <td className="px-6 py-4">
                    {student.isHosteler && (
                      <span className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">Hostel</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {student.pendingTotal > 0 ? (
                      <div className="flex flex-col">
                        <span className="font-bold text-red-600">₹{student.pendingTotal}</span>
                        <span className="text-xs text-gray-500">{student.monthsPending} records pending</span>
                      </div>
                    ) : (
                      <span className="text-green-600 font-medium">Cleared</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      disabled={student.pendingTotal === 0}
                      onClick={() => setSelectedStudent(student)}
                      className="rounded bg-emerald-500 px-4 py-1.5 text-white font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Collect
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Payment Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-xl font-bold">Collect Payment</h2>
            <p className="mb-6 text-sm text-gray-600">
              Receiving for <strong>{selectedStudent.name}</strong> (Total Due: ₹{selectedStudent.pendingTotal})
            </p>

            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount Received (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedStudent.pendingTotal}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 outline-none"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="rounded-lg px-4 py-2 font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {processing ? "Processing..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}