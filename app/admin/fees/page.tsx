"use client";

import React, { useState } from "react";
import {
  Bus,
  Home,
  UserCheck,
  Edit3,
  CreditCard,
  DollarSign,
  Search,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  Clock,
  X
} from "lucide-react";

// Mock Sample Data for 7 Students as required
const INITIAL_STUDENTS = [
  { id: "s1", admNo: "1846", name: "Nikhil Raj", className: "VII-A", category: "DAY_SCHOLAR", totalPaid: 7800 },
  { id: "s2", admNo: "3079", name: "Ardsheep Mehta", className: "VII-A", category: "TRANSPORT", totalPaid: 16600 },
  { id: "s3", admNo: "2558", name: "Rahul Kumar", className: "VII-A", category: "HOSTELLER", totalPaid: 16300 },
  { id: "s4", admNo: "1995", name: "Anshu Kumari", className: "VII-A", category: "TRANSPORT", totalPaid: 20800 },
  { id: "s5", admNo: "2111", name: "Vivek Kumar", className: "X-A", category: "HOSTELLER", totalPaid: 11400 },
  { id: "s6", admNo: "2313", name: "Riya Kumari", className: "LKG-A", category: "TRANSPORT", totalPaid: 7600 },
  { id: "s7", admNo: "2370", name: "Baljeet Pratap", className: "XI-A", category: "DAY_SCHOLAR", totalPaid: 12100 },
];

const FEE_RATES: Record<string, { tuition: number; transport: number; mess: number; annual: number; exam: number }> = {
  "LKG": { tuition: 1500, transport: 900, mess: 3700, annual: 4000, exam: 500 },
  "VII": { tuition: 1900, transport: 900, mess: 4000, annual: 4000, exam: 500 },
  "X":   { tuition: 2400, transport: 900, mess: 4500, annual: 4000, exam: 600 },
  "XI":  { tuition: 2700, transport: 900, mess: 0,    annual: 4000, exam: 750 },
};

const MONTH_NAMES = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

export default function AdminFeeManagementPage() {
  const [students, setStudents] = useState(INITIAL_STUDENTS);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Calculate Full Monthly Ledger for Any Student Dynamically
  const getStudentLedger = (student: typeof INITIAL_STUDENTS[0]) => {
    const baseClass = student.className.split("-")[0];
    const rate = FEE_RATES[baseClass] || FEE_RATES["VII"];

    let remainingPayment = student.totalPaid;
    const months = [];

    for (let i = 0; i < 12; i++) {
      const monthName = MONTH_NAMES[i];
      const tuition = rate.tuition;
      const transport = student.category === "TRANSPORT" ? rate.transport : 0;
      const mess = student.category === "HOSTELLER" ? rate.mess : 0;
      const annual = i === 0 ? (student.category === "HOSTELLER" ? rate.annual + 500 : rate.annual) : 0;
      const exam = (i === 5 || i === 11) ? rate.exam : 0;

      const monthGross = tuition + transport + mess + annual + exam;

      let monthPaid = 0;
      let monthDue = monthGross;
      let status: "PAID" | "PARTIAL" | "PENDING" = "PENDING";

      if (remainingPayment >= monthGross) {
        monthPaid = monthGross;
        monthDue = 0;
        remainingPayment -= monthGross;
        status = "PAID";
      } else if (remainingPayment > 0) {
        monthPaid = remainingPayment;
        monthDue = monthGross - remainingPayment;
        remainingPayment = 0;
        status = "PARTIAL";
      } else {
        monthPaid = 0;
        monthDue = monthGross;
        status = "PENDING";
      }

      months.push({
        monthNumber: i + 1,
        monthName,
        tuition,
        transport,
        mess,
        annual,
        exam,
        monthGross,
        monthPaid,
        monthDue,
        status,
      });
    }

    const grossYearly = months.reduce((a, b) => a + b.monthGross, 0);
    const netOutstanding = Math.max(0, grossYearly - student.totalPaid);
    const monthlyBase = rate.tuition + (student.category === "TRANSPORT" ? rate.transport : student.category === "HOSTELLER" ? rate.mess : 0);
    const paidMonthsFraction = (student.totalPaid / monthlyBase).toFixed(1);

    return {
      months,
      grossYearly,
      netOutstanding,
      paidMonthsFraction,
      monthlyBase,
    };
  };

  // 2. Admin Action: Change Student Category (e.g. Day Scholar <-> Transport <-> Hosteller)
  const handleCategoryChange = (studentId: string, newCategory: "DAY_SCHOLAR" | "TRANSPORT" | "HOSTELLER") => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, category: newCategory } : s))
    );
    showToast(`Updated student facility category to ${newCategory}`);
  };

  // 3. Admin Action: Record Payment
  const handleRecordPayment = (studentId: string) => {
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) return;

    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, totalPaid: s.totalPaid + amt } : s))
    );
    setPaymentAmount("");
    showToast(`Payment of ₹${amt.toLocaleString()} recorded successfully!`);
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admNo.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard className="text-indigo-400" /> Rosebud School Fee Management System
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-Time Multi-Head Ledger with Transport, Mess, and Partial Month Payment Calculator
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search student or Adm No..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {toastMessage}
        </div>
      )}

      {/* Main Student Table */}
      <div className="mt-6 bg-slate-800/60 border border-slate-700/80 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="font-semibold text-slate-200">Enrolled Students Ledger ({filteredStudents.length})</h2>
          <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-full">
            Session 2026–27
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-xs font-semibold">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Category / Facility</th>
                <th className="py-3 px-4">Progress / Paid Months</th>
                <th className="py-3 px-4">Total Paid</th>
                <th className="py-3 px-4">Net Dues</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredStudents.map((s) => {
                const { grossYearly, netOutstanding, paidMonthsFraction, monthlyBase } = getStudentLedger(s);

                return (
                  <tr key={s.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-white">
                      <div>{s.name}</div>
                      <div className="text-xs text-slate-400">Adm: #{s.admNo}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{s.className}</td>
                    <td className="py-3.5 px-4">
                      {/* Facility Toggle */}
                      <select
                        value={s.category}
                        onChange={(e) => handleCategoryChange(s.id, e.target.value as any)}
                        className="bg-slate-900 border border-slate-600 text-xs rounded-md px-2 py-1 text-slate-200 focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="DAY_SCHOLAR">🏫 Day Scholar</option>
                        <option value="TRANSPORT">🚌 Bus Commuter</option>
                        <option value="HOSTELLER">🏨 Hosteller (Mess)</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-semibold">{paidMonthsFraction} Months</div>
                      <div className="text-xs text-slate-400">Base: ₹{monthlyBase}/mo</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-400">
                      ₹{s.totalPaid.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold">
                      {netOutstanding > 0 ? (
                        <span className="text-rose-400">₹{netOutstanding.toLocaleString()}</span>
                      ) : (
                        <span className="text-emerald-400">CLEARED</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedStudent(s)}
                        className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-md font-medium transition"
                      >
                        Inspect Ledger <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Month Breakdown Modal */}
      {selectedStudent && (() => {
        const { months, grossYearly, netOutstanding, monthlyBase } = getStudentLedger(selectedStudent);

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {selectedStudent.name} <span className="text-xs text-slate-400 font-normal">({selectedStudent.className})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Admission No: #{selectedStudent.admNo} • Category: <strong className="text-indigo-300">{selectedStudent.category}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body: Payment Recording Box + Month Matrix */}
              <div className="p-5 overflow-y-auto space-y-6">
                {/* Record Counter Payment Form */}
                <div className="bg-slate-900/90 border border-indigo-500/30 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <label className="text-xs text-slate-400 block font-medium">Record New Counter Payment</label>
                    <span className="text-xs text-slate-500">Auto-allocated FIFO across monthly line items</span>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="number"
                      placeholder="Amount in ₹"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-36"
                    />
                    <button
                      onClick={() => handleRecordPayment(selectedStudent.id)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-md transition"
                    >
                      Receive Payment
                    </button>
                  </div>
                </div>

                {/* 12-Month Itemized Breakdown Table */}
                <div>
                  <h4 className="text-xs font-semibold uppercase text-slate-400 mb-3">Itemized 12-Month Billing Matrix</h4>
                  <div className="border border-slate-700 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 uppercase font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Month</th>
                          <th className="py-2.5 px-3">Tuition</th>
                          <th className="py-2.5 px-3">Transport</th>
                          <th className="py-2.5 px-3">Mess</th>
                          <th className="py-2.5 px-3">Annual/Exam</th>
                          <th className="py-2.5 px-3">Total Due</th>
                          <th className="py-2.5 px-3">Paid</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/60 bg-slate-800/40">
                        {months.map((m) => (
                          <tr key={m.monthNumber} className="hover:bg-slate-700/20">
                            <td className="py-2 px-3 font-semibold text-slate-200">{m.monthName}</td>
                            <td className="py-2 px-3">₹{m.tuition}</td>
                            <td className="py-2 px-3">{m.transport > 0 ? `₹${m.transport}` : "-"}</td>
                            <td className="py-2 px-3">{m.mess > 0 ? `₹${m.mess}` : "-"}</td>
                            <td className="py-2 px-3">
                              {m.annual + m.exam > 0 ? `₹${m.annual + m.exam}` : "-"}
                            </td>
                            <td className="py-2 px-3 font-mono font-medium text-slate-200">₹{m.monthGross}</td>
                            <td className="py-2 px-3 font-mono text-emerald-400">₹{m.monthPaid}</td>
                            <td className="py-2 px-3">
                              {m.status === "PAID" && (
                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px] font-semibold">
                                  PAID
                                </span>
                              )}
                              {m.status === "PARTIAL" && (
                                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded text-[10px] font-semibold">
                                  PARTIAL (₹{m.monthDue} Rem)
                                </span>
                              )}
                              {m.status === "PENDING" && (
                                <span className="bg-slate-700 text-slate-400 px-2 py-0.5 rounded text-[10px]">
                                  UNPAID
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Modal Footer Summary */}
              <div className="p-4 bg-slate-900 border-t border-slate-700 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-400">Yearly Gross: </span>
                  <strong className="text-white font-mono mr-4">₹{grossYearly.toLocaleString()}</strong>
                  <span className="text-slate-400">Net Outstanding: </span>
                  <strong className="text-rose-400 font-mono">₹{netOutstanding.toLocaleString()}</strong>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-1.5 rounded-md border border-slate-600"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}