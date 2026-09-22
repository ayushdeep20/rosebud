"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import {
  Search,
  RefreshCw,
  Users,
  Receipt,
  AlertCircle,
  Clock,
  FileSpreadsheet,
  Building2,
  Bus,
  User,
} from "lucide-react";

interface StudentDuesItem {
  id: string;
  admissionNo: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  className: string;
  rollNumber: string;
  fatherPhone: string;
  totalOutstandingDues: number;
  pendingMonths: string;
  studentCategory: "Dayscholar" | "Boarding / Hostel" | "Transport" | "Custom / Mixed";
  status: "PAID" | "PARTIAL" | "OVERDUE";
}

export default function OutstandingDuesPage() {
  const [students, setStudents] = useState<StudentDuesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("ALL");

  useEffect(() => {
    fetchDuesData();
  }, []);

  async function fetchDuesData() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/fees/dues");
      const data = await res.json();
      if (data.students) {
        setStudents(data.students);
      }
    } catch (err) {
      console.error("Failed to fetch dues data", err);
    } finally {
      setLoading(false);
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const records = XLSX.utils.sheet_to_json(worksheet);

      const res = await fetch("/api/admin/fees/dues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      });

      const result = await res.json();
      if (result.success) {
        alert(`Successfully imported ${result.count} defaulter records!`);
        fetchDuesData();
      } else {
        alert(result.error || "Failed to import file.");
      }
    } catch (err) {
      console.error("Error reading excel file", err);
      alert("Error parsing the excel file.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const classOptions = Array.from(
    new Set(students.map((s) => s.className).filter((c) => c && c !== "Unassigned"))
  ).sort();

  const filteredStudents = students.filter((s) => {
    const q = searchTerm.toLowerCase();
    const adm = (s.admissionNumber || s.admissionNo || "").toLowerCase();
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();

    const matchesSearch =
      fullName.includes(q) || adm.includes(q) || s.className?.toLowerCase().includes(q);

    const matchesClass =
      selectedClassFilter === "ALL" || s.className === selectedClassFilter;

    return matchesSearch && matchesClass;
  });

  const totalSchoolOutstanding = students.reduce(
    (acc, curr) => acc + (curr.totalOutstandingDues || 0),
    0
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const renderCategoryBadge = (cat: string) => {
    switch (cat) {
      case "Boarding / Hostel":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[11px] font-medium">
            <Building2 className="h-3 w-3" /> Boarder
          </span>
        );
      case "Transport":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-medium">
            <Bus className="h-3 w-3" /> Bus User
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[11px] font-medium">
            <User className="h-3 w-3" /> Dayscholar
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 p-6 lg:p-10 space-y-8 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
            <Receipt className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Outstanding Dues & Defaulters List
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Rosebud School — Filter student records, inspect fee structures, and track pending months
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium cursor-pointer transition shadow-lg shadow-indigo-600/20">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            {uploading ? "Uploading..." : "Import Defaulter Excel"}
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>

          <button
            onClick={fetchDuesData}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-medium transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Sync Ledger
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
          <div className="p-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Pending Dues</p>
            <p className="text-xl font-bold text-rose-400 mt-0.5">{formatCurrency(totalSchoolOutstanding)}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
          <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Defaulter Students</p>
            <p className="text-xl font-bold text-white mt-0.5">{students.length}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Classes Active</p>
            <p className="text-xl font-bold text-white mt-0.5">{classOptions.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, adm no, class..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <label className="text-xs text-slate-400 font-medium whitespace-nowrap">Class Filter:</label>
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="ALL">All Classes ({classOptions.length})</option>
            {classOptions.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-5">Adm No</th>
                <th className="py-3.5 px-5">Student Name</th>
                <th className="py-3.5 px-5">Class & Roll</th>
                <th className="py-3.5 px-5">Category</th>
                <th className="py-3.5 px-5">Pending Duration</th>
                <th className="py-3.5 px-5">Father's Contact</th>
                <th className="py-3.5 px-5">Dues Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-400 mb-2" />
                    Calculating student fee balances...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No matching student fee records found. Click "Import Defaulter Excel" above to upload your sheet.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-indigo-400 font-semibold">{s.admissionNumber}</td>
                    <td className="py-3.5 px-5 text-white font-semibold">
                      {s.firstName} {s.lastName}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-slate-300 font-medium text-[11px]">
                        {s.className} (Roll #{s.rollNumber})
                      </span>
                    </td>
                    <td className="py-3.5 px-5">{renderCategoryBadge(s.studentCategory)}</td>
                    <td className="py-3.5 px-5 font-medium text-amber-300">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-400" />
                        {s.pendingMonths}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-300">{s.fatherPhone}</td>
                    <td className="py-3.5 px-5 font-mono font-bold text-rose-400">{formatCurrency(s.totalOutstandingDues)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}