"use client";

import { useState, useEffect } from "react";

type FeeDue = {
  id: string;
  feeType: "ADMISSION" | "ANNUAL" | "TUITION" | "TRANSPORT" | "MESS" | "PREVIOUS_DUES" | "OTHER";
  month: number;
  year: number;
  description: string;
  amountDue: number;
  amountPaid: number;
  status: "PENDING" | "PARTIAL" | "PAID";
};

type Payment = {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceId: string | null;
};

type FeeStatement = {
  academicYearId: string;
  summary: {
    totalExpected: number;
    totalPaid: number;
    totalPending: number;
  };
  feeDues: FeeDue[];
  payments: Payment[];
};

const FEE_TYPE_LABELS: Record<FeeDue["feeType"], string> = {
  ADMISSION: "Admission Fee",
  ANNUAL: "Annual Fee",
  TUITION: "Tuition",
  TRANSPORT: "Transport",
  MESS: "Mess (Hostel)",
  PREVIOUS_DUES: "Previous Dues",
  OTHER: "Other",
};

export default function StudentFeePortalPage() {
  const [statement, setStatement] = useState<FeeStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchStatement() {
      try {
        const res = await fetch("/api/student/fees");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load fee statement.");
        setStatement(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    void fetchStatement();
  }, []);

  const getMonthName = (monthNum: number) => {
    const date = new Date(2026, monthNum - 1, 1);
    return date.toLocaleString("default", { month: "long" });
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading your fee ledger...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!statement) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-8 max-w-5xl mx-auto">
      <h1 className="mb-2 text-2xl font-bold text-gray-800">Fee Statement & Ledger</h1>
      <p className="mb-6 text-sm text-gray-500">View your itemized dues and payment receipts.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Total Billed</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">₹{statement.summary.totalExpected}</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Total Paid</p>
          <p className="text-2xl font-bold text-green-600 mt-1">₹{statement.summary.totalPaid}</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Pending Dues</p>
          <p className={`text-2xl font-bold mt-1 ${statement.summary.totalPending > 0 ? "text-red-600" : "text-gray-900"}`}>
            ₹{statement.summary.totalPending}
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-800">Fee Breakdown</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="px-6 py-3 font-medium">Month / Year</th>
              <th className="px-6 py-3 font-medium">Fee Type</th>
              <th className="px-6 py-3 font-medium">Amount Due</th>
              <th className="px-6 py-3 font-medium">Paid</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {statement.feeDues.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-gray-500">No fee records found for this academic year.</td></tr>
            ) : (
              statement.feeDues.map((due) => {
                const balance = due.amountDue - due.amountPaid;
                return (
                  <tr key={due.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {getMonthName(due.month)} {due.year}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                        {FEE_TYPE_LABELS[due.feeType]}
                        {due.feeType === "OTHER" && due.description ? ` — ${due.description}` : ""}
                      </span>
                    </td>
                    <td className="px-6 py-4">₹{due.amountDue}</td>
                    <td className="px-6 py-4">₹{due.amountPaid}</td>
                    <td className="px-6 py-4">
                      {due.status === "PAID" ? (
                        <span className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">Paid</span>
                      ) : due.status === "PARTIAL" ? (
                        <span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                          Partial (Bal: ₹{balance})
                        </span>
                      ) : (
                        <span className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">Pending</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-800">Payment History & Receipts</h2>
        </div>
        <div className="divide-y">
          {statement.payments.length === 0 ? (
            <p className="p-6 text-center text-gray-500 text-sm">No payment records found.</p>
          ) : (
            statement.payments.map((pay) => (
              <div key={pay.id} className="px-6 py-4 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-900">Paid ₹{pay.amount}</p>
                  <p className="text-xs text-gray-500">
                    Method: {pay.paymentMethod} {pay.referenceId ? `• Ref: ${pay.referenceId}` : ""}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  {new Date(pay.paymentDate).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}