"use client";

import { useEffect, useState } from "react";
import { Search, KeyRound, CheckCircle2, AlertCircle, RefreshCw, ShieldAlert, X } from "lucide-react";

interface Student {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  rollNumber: string;
  className: string;
  username: string;
  hasUserAccount: boolean;
}

export default function CredentialsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newPassword, setNewPassword] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/students");
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } catch (err) {
      console.error("Failed to load students", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !newPassword) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          username: selectedStudent.username,
          newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: data.message || `Password set successfully!` });
        setNewPassword("");
        fetchStudents(); // Refresh table state
        setTimeout(() => setSelectedStudent(null), 1500);
      } else {
        setMessage({ type: "error", text: data.error || "Failed to reset password." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Server error occurred while resetting password." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      s.admissionNo.toLowerCase().includes(q) ||
      s.rollNumber.toLowerCase().includes(q) ||
      s.className.toLowerCase().includes(q) ||
      s.username.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <KeyRound className="w-7 h-7 text-indigo-400" /> Credentials Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage student credentials, view login usernames, and assign or reset passwords.
          </p>
        </div>
        <button
          onClick={fetchStudents}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, adm no, roll no, class, or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>
        <div className="text-xs font-mono text-slate-400">
          Total Students: <span className="text-indigo-400 font-bold">{filteredStudents.length}</span>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            <p className="text-sm font-mono">Loading credentials...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-mono text-sm">
            No matching students found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-mono text-xs tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Adm. No</th>
                  <th className="py-3.5 px-4">Student Name</th>
                  <th className="py-3.5 px-4">Class</th>
                  <th className="py-3.5 px-4">Roll No</th>
                  <th className="py-3.5 px-4">Login Username</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-indigo-400">
                      {s.admissionNo}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-100">
                      {s.firstName} {s.lastName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-800 text-xs font-medium text-slate-300 border border-slate-700/60">
                        {s.className}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {s.rollNumber}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs">
                      <span className="bg-slate-950 px-2.5 py-1 rounded text-indigo-300 border border-slate-800 font-semibold">
                        {s.username}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedStudent(s);
                          setMessage(null);
                          setNewPassword("");
                        }}
                        className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold transition-all"
                      >
                        Reset Password
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-5">
            <button
              onClick={() => setSelectedStudent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Reset Student Password</h3>
                <p className="text-xs text-slate-400">
                  {selectedStudent.firstName} {selectedStudent.lastName} ({selectedStudent.admissionNo})
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1 font-mono text-xs">
              <div className="text-slate-400">Username: <span className="text-indigo-400 font-bold">{selectedStudent.username}</span></div>
              <div className="text-slate-400">Class: <span className="text-slate-200">{selectedStudent.className}</span> | Roll: <span className="text-slate-200">{selectedStudent.rollNumber}</span></div>
            </div>

            {message && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                  message.type === "success"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border-red-500/20"
                }`}
              >
                {message.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newPassword}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl transition-all flex items-center gap-2"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />} Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}