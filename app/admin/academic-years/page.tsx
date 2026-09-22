// app/admin/academic-years/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ArrowLeft, Calendar, ShieldCheck } from "lucide-react";

export default async function AcademicYearsPage() {
  const years = await prisma.academicYear
    .findMany({
      orderBy: { startDate: "desc" },
    })
    .catch(() => []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-400 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calendar className="w-6 h-6 text-indigo-400" /> Academic Years Configuration
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          View and set current operational session for the institution.
        </p>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400 uppercase font-mono tracking-wider">
              <tr>
                <th className="pb-3 px-3">Session Label</th>
                <th className="pb-3 px-3">Start Date</th>
                <th className="pb-3 px-3">End Date</th>
                <th className="pb-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {years.length > 0 ? (
                years.map((y: any) => (
                  <tr key={y.id} className="hover:bg-slate-800/40">
                    <td className="py-3.5 px-3 font-bold text-slate-100">
                      {y.label || y.name}
                    </td>
                    <td className="py-3.5 px-3 text-slate-400">
                      {y.startDate ? new Date(y.startDate).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="py-3.5 px-3 text-slate-400">
                      {y.endDate ? new Date(y.endDate).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="py-3.5 px-3">
                      {y.isCurrent ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <ShieldCheck className="w-3 h-3" /> Active Current Session
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">
                          Archived
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    No academic years found in database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}