"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Eye,
  Edit3,
  X,
  User,
  Phone,
  MapPin,
  School,
  Bus,
  ShieldCheck,
  Save,
  Loader2,
  RefreshCw,
  Users,
  GraduationCap,
  Sparkles,
  ChevronRight,
  Hash,
  Activity,
  Calendar,
} from "lucide-react";

interface StudentItem {
  id: string;
  admissionNo: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  className: string;
  rollNumber: string;
  username: string;
  hasUserAccount: boolean;
}

export default function StudentDirectoryPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("ALL");

  // View / Edit Modal States
  const [viewStudent, setViewStudent] = useState<any>(null);
  const [editStudent, setEditStudent] = useState<any>(null);
  const [fetchingDetail, setFetchingDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"personal" | "family" | "academic" | "logistics">("personal");

  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/students");
      const data = await res.json();
      if (data.students) {
        setStudents(data.students);
      }
    } catch (err) {
      console.error("Failed to load students", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenView(id: string) {
    setFetchingDetail(true);
    try {
      const res = await fetch(`/api/admin/students/${id}`);
      const data = await res.json();
      if (data.student) {
        setViewStudent(data.student);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingDetail(false);
    }
  }

  async function handleOpenEdit(id: string) {
    setFetchingDetail(true);
    try {
      const res = await fetch(`/api/admin/students/${id}`);
      const data = await res.json();
      if (data.student) {
        const dob = data.student.dateOfBirth
          ? new Date(data.student.dateOfBirth).toISOString().split("T")[0]
          : "";
        setEditStudent({ ...data.student, dateOfBirth: dob });
        setActiveTab("personal");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingDetail(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editStudent) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/students/${editStudent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editStudent),
      });

      if (res.ok) {
        setEditStudent(null);
        fetchStudents();
      } else {
        alert("Failed to update student details.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  }

  // Unique Class options for filter dropdown
  const classOptions = Array.from(
    new Set(students.map((s) => s.className).filter((c) => c && c !== "Unassigned"))
  ).sort();

  const filteredStudents = students.filter((s) => {
    const q = searchTerm.toLowerCase();
    const adm = (s.admissionNumber || s.admissionNo || "").toLowerCase();
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
    const uname = (s.username || "").toLowerCase();

    const matchesSearch =
      fullName.includes(q) || adm.includes(q) || uname.includes(q) || s.className?.toLowerCase().includes(q);

    const matchesClass =
      selectedClassFilter === "ALL" || s.className === selectedClassFilter;

    return matchesSearch && matchesClass;
  });

  const renderValue = (val: any) => {
    if (val === null || val === undefined || val === "" || val === "N/A") {
      return <span className="text-slate-500 italic text-xs">Not Provided</span>;
    }
    if (typeof val === "boolean") {
      return val ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Enabled / Yes
        </span>
      ) : (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
          No
        </span>
      );
    }
    return <span className="text-slate-200 font-medium text-sm">{String(val)}</span>;
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 p-6 lg:p-10 space-y-8 font-sans">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
              <GraduationCap className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Student Directory</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized student records, enrollment mapping & credentials management
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStudents}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-medium transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* METRICS / STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Students</p>
            <p className="text-xl font-bold text-white mt-0.5">{students.length}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Linked Login Accounts</p>
            <p className="text-xl font-bold text-white mt-0.5">
              {students.filter((s) => s.hasUserAccount).length}
            </p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl">
            <School className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Active Classes</p>
            <p className="text-xl font-bold text-white mt-0.5">{classOptions.length}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Filtered Results</p>
            <p className="text-xl font-bold text-white mt-0.5">{filteredStudents.length}</p>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg backdrop-blur-xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, adm no, class, username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <label className="text-xs text-slate-400 font-medium whitespace-nowrap">Filter Class:</label>
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="ALL">All Classes ({students.length})</option>
            {classOptions.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLE CONTAINER */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-5">Adm No</th>
                <th className="py-3.5 px-5">Student Name</th>
                <th className="py-3.5 px-5">Class & Section</th>
                <th className="py-3.5 px-5">Roll No</th>
                <th className="py-3.5 px-5">Login Username</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-400 mb-2" />
                    Loading directory records...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No matching student records found.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const admNumber = s.admissionNumber || s.admissionNo || "N/A";
                  return (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-indigo-400 font-semibold">
                        {admNumber}
                      </td>
                      <td className="py-3.5 px-5 text-white font-semibold">
                        {s.firstName} {s.lastName}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 font-medium text-[11px]">
                          {s.className || "Unassigned"}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-slate-300 font-mono">
                        {s.rollNumber || "N/A"}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          {s.username || admNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right space-x-2">
                        <button
                          onClick={() => handleOpenView(s.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/50 transition"
                          title="View Full Profile"
                        >
                          <Eye className="h-3.5 w-3.5 text-indigo-400" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => handleOpenEdit(s.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 transition"
                          title="Edit Details"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW MODAL DRAWER */}
      {viewStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B0F19] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-800/80 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {viewStudent.firstName} {viewStudent.lastName}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Admission No:{" "}
                    <span className="text-indigo-400 font-mono font-semibold">
                      {viewStudent.admissionNumber || viewStudent.admissionNo || "N/A"}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewStudent(null)}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Profile Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Personal Information */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs tracking-wider uppercase border-b border-slate-800/60 pb-2">
                  <User className="h-4 w-4" /> Personal Profile
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl">
                  <div>
                    <p className="text-[11px] text-slate-400">Gender</p>
                    {renderValue(viewStudent.gender)}
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Date of Birth</p>
                    {renderValue(
                      viewStudent.dateOfBirth
                        ? new Date(viewStudent.dateOfBirth).toLocaleDateString()
                        : null
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Blood Group</p>
                    {renderValue(viewStudent.bloodGroup)}
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Category / Religion</p>
                    {renderValue(
                      viewStudent.category
                        ? `${viewStudent.category} / ${viewStudent.religion || "N/A"}`
                        : null
                    )}
                  </div>
                </div>
              </div>

              {/* Family & Contact */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs tracking-wider uppercase border-b border-slate-800/60 pb-2">
                  <Phone className="h-4 w-4" /> Family & Contact
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl">
                  <div>
                    <p className="text-[11px] text-slate-400">Father's Name</p>
                    {renderValue(viewStudent.fatherName)}
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Father's Phone</p>
                    {renderValue(viewStudent.fatherPhone)}
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Occupation / Qualification</p>
                    {renderValue(
                      viewStudent.fathersOccupation
                        ? `${viewStudent.fathersOccupation} (${viewStudent.fathersQualification || "N/A"})`
                        : null
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Mother's Name</p>
                    {renderValue(viewStudent.motherName)}
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Mother's Phone</p>
                    {renderValue(viewStudent.motherPhone)}
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Address / District</p>
                    {renderValue(
                      viewStudent.address
                        ? `${viewStudent.address}, ${viewStudent.district || ""}`
                        : null
                    )}
                  </div>
                </div>
              </div>

              {/* Transport & Facilities */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs tracking-wider uppercase border-b border-slate-800/60 pb-2">
                  <Bus className="h-4 w-4" /> Transport & Hostel
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl">
                  <div>
                    <p className="text-[11px] text-slate-400">Hostel Facility</p>
                    {renderValue(viewStudent.hostelFacility)}
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Bus Facility</p>
                    {renderValue(viewStudent.busFacility)}
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Bus Number</p>
                    {renderValue(viewStudent.busNo)}
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Bus Stop / Point</p>
                    {renderValue(viewStudent.busPoint)}
                  </div>
                </div>
              </div>

              {/* Identifiers & Medical */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs tracking-wider uppercase border-b border-slate-800/60 pb-2">
                  <ShieldCheck className="h-4 w-4" /> Identifiers & Academic Metadata
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl">
                  <div>
                    <p className="text-[11px] text-slate-400">APAAR ID</p>
                    {renderValue(viewStudent.apaarId)}
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">PEN Number</p>
                    {renderValue(viewStudent.penNo)}
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Registration No</p>
                    {renderValue(viewStudent.regNo)}
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Encrypted Aadhaar</p>
                    {renderValue(viewStudent.aadhaarEncrypted)}
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Height / Weight</p>
                    {renderValue(
                      viewStudent.height
                        ? `${viewStudent.height} cm / ${viewStudent.weight || "—"} kg`
                        : null
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">Previous School</p>
                    {renderValue(viewStudent.previousSchool)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL DRAWER */}
      {editStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEdit}
            className="bg-[#0B0F19] border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-800/80 bg-slate-950 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">
                  Edit Profile: {editStudent.firstName} {editStudent.lastName}
                </h2>
                <p className="text-xs text-slate-400">
                  Admission No:{" "}
                  <span className="text-indigo-400 font-mono">
                    {editStudent.admissionNumber || editStudent.admissionNo}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditStudent(null)}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 gap-6 text-xs font-medium">
              {(["personal", "family", "academic", "logistics"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 capitalize border-b-2 transition ${
                    activeTab === tab
                      ? "border-indigo-500 text-indigo-400 font-semibold"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab} Details
                </button>
              ))}
            </div>

            {/* Content Tabs */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {activeTab === "personal" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400">First Name</label>
                    <input
                      type="text"
                      value={editStudent.firstName || ""}
                      onChange={(e) => setEditStudent({ ...editStudent, firstName: e.target.value })}
                      className="w-full mt-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400">Last Name</label>
                    <input
                      type="text"
                      value={editStudent.lastName || ""}
                      onChange={(e) => setEditStudent({ ...editStudent, lastName: e.target.value })}
                      className="w-full mt-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400">Gender</label>
                    <select
                      value={editStudent.gender || ""}
                      onChange={(e) => setEditStudent({ ...editStudent, gender: e.target.value })}
                      className="w-full mt-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Select</option>
                      <option value="M">Male (M)</option>
                      <option value="F">Female (F)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400">Date of Birth</label>
                    <input
                      type="date"
                      value={editStudent.dateOfBirth || ""}
                      onChange={(e) => setEditStudent({ ...editStudent, dateOfBirth: e.target.value })}
                      className="w-full mt-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400">Blood Group</label>
                    <input
                      type="text"
                      value={editStudent.bloodGroup || ""}
                      onChange={(e) => setEditStudent({ ...editStudent, bloodGroup: e.target.value })}
                      className="w-full mt-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400">Category</label>
                    <input
                      type="text"
                      value={editStudent.category || ""}
                      onChange={(e) => setEditStudent({ ...editStudent, category: e.target.value })}
                      className="w-full mt-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {activeTab === "family" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400">Father's Name</label>
                    <input
                      type="text"
                      value={editStudent.fatherName || ""}
                      onChange={(e) => setEditStudent({ ...editStudent, fatherName: e.target.value })}
                      className="w-full mt-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400">Father's Phone</label>
                    <input
                      type="text"
                      value={editStudent.fatherPhone || ""}
                      onChange={(e) => setEditStudent({ ...editStudent, fatherPhone: e.target.value })}
                      className="w-full mt-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400">Mother's Name</label>
                    <input
                      type="text"
                      value={editStudent.motherName || ""}
                      onChange={(e) => setEditStudent({ ...editStudent, motherName: e.target.value })}
                      className="w-full mt-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400">Mother's Phone</label>
                    <input
                      type="text"
                      value={editStudent.motherPhone || ""}
                      onChange={(e) => setEditStudent({ ...editStudent, motherPhone: e.target.value })}
                      className="w-full mt-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-slate-400">Address</label>
                    <input
                      type="text"
                      value={editStudent.address || ""}
                      onChange={(e) => setEditStudent({ ...editStudent, address: e.target.value })}
                      className="w-full mt-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {activeTab === "academic" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400">Roll Number</label>
                    <input
                      type="number"
                      value={editStudent.rollNumber || ""}
                      onChange={(e) => setEditStudent({ ...editStudent, rollNumber: e.target.value })}
                      className="w-full mt-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400">Registration No</label>
                    <input
                      type="text"
                      value={editStudent.regNo || ""}
                      onChange={(e) => setEditStudent({ ...editStudent, regNo: e.target.value })}
                      className="w-full mt-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400">APAAR ID</label>
                    <input
                      type="text"
                      value={editStudent.apaarId || ""}
                      onChange={(e) => setEditStudent({ ...editStudent, apaarId: e.target.value })}
                      className="w-full mt-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400">PEN Number</label>
                    <input
                      type="text"
                      value={editStudent.penNo || ""}
                      onChange={(e) => setEditStudent({ ...editStudent, penNo: e.target.value })}
                      className="w-full mt-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              {activeTab === "logistics" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400">Bus Number</label>
                    <input
                      type="text"
                      value={editStudent.busNo || ""}
                      onChange={(e) => setEditStudent({ ...editStudent, busNo: e.target.value })}
                      className="w-full mt-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400">Bus Stop / Point</label>
                    <input
                      type="text"
                      value={editStudent.busPoint || ""}
                      onChange={(e) => setEditStudent({ ...editStudent, busPoint: e.target.value })}
                      className="w-full mt-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400">Height (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editStudent.height || ""}
                      onChange={(e) => setEditStudent({ ...editStudent, height: e.target.value })}
                      className="w-full mt-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editStudent.weight || ""}
                      onChange={(e) => setEditStudent({ ...editStudent, weight: e.target.value })}
                      className="w-full mt-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-800/80 bg-slate-950 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditStudent(null)}
                className="px-4 py-2 text-xs rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-2 transition disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Student Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}