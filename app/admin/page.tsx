// app/admin/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  GraduationCap,
  Receipt,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  IndianRupee,
  BookOpen,
  KeyRound,
  Calendar,
} from "lucide-react";

async function getAdminMetrics() {
  try {
    const [totalStudents, totalSections, defaultersCount] =
      await Promise.all([
        prisma.student.count().catch(() => 0),
        prisma.section.count().catch(() => 0),
        prisma.feeDue.count({ where: { status: "PENDING" } }).catch(() => 0),
      ]);

    const activeYear = await prisma.academicYear
      .findFirst({
        where: { isCurrent: true },
        orderBy: { startDate: "desc" },
      })
      .catch(() => null);

    const revenue = await prisma.payment
      .aggregate({ _sum: { amount: true } })
      .catch(() => ({ _sum: { amount: 0 } }));

    const pendingDuesSum = await prisma.feeDue
      .aggregate({
        _sum: { amountDue: true },
        where: { status: "PENDING" },
      })
      .catch(() => ({ _sum: { amountDue: 0 } }));

    return {
      totalStudents,
      activeSections: totalSections,
      activeAcademicYear: activeYear?.label || "2026-2027",
      defaultersCount,
      pendingDuesAmount: pendingDuesSum._sum?.amountDue ?? 0,
      totalCollected: revenue._sum?.amount ?? 0,
    };
  } catch (error) {
    return {
      totalStudents: 0,
      activeSections: 0,
      activeAcademicYear: "N/A",
      defaultersCount: 0,
      pendingDuesAmount: 0,
      totalCollected: 0,
    };
  }
}

export default async function AdminDashboardPage() {
  const metrics = await getAdminMetrics();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-8 font-sans">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/academic-years"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
            >
              <Calendar className="w-3 h-3" />
              Academic Session: {metrics.activeAcademicYear} (Click to Change)
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-2">
            Executive Command Center
          </h1>
          <p className="text-slate-400 text-sm">
            Managing {metrics.totalStudents.toLocaleString("en-IN")} total students across {metrics.activeSections} sections.
          </p>
        </div>

        <Link
          href="/admin/credentials"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20"
        >
          <KeyRound className="w-4 h-4" />
          Credentials & Password Center
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Students"
          value={metrics.totalStudents.toLocaleString("en-IN")}
          subtitle={`Across ${metrics.activeSections} sections`}
          icon={<GraduationCap className="w-5 h-5 text-indigo-400" />}
        />
        <MetricCard
          title="Revenue Collected"
          value={`₹${metrics.totalCollected.toLocaleString("en-IN")}`}
          subtitle="Total verified payments"
          icon={<IndianRupee className="w-5 h-5 text-emerald-400" />}
        />
        <MetricCard
          title="Pending Dues Total"
          value={`₹${metrics.pendingDuesAmount.toLocaleString("en-IN")}`}
          subtitle={`${metrics.defaultersCount} students with pending balance`}
          icon={<AlertCircle className="w-5 h-5 text-amber-400" />}
          href="/admin/fees/dues"
        />
        <MetricCard
          title="Active Session"
          value={metrics.activeAcademicYear}
          subtitle="Current operational year"
          icon={<ShieldCheck className="w-5 h-5 text-blue-400" />}
          href="/admin/academic-years"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ModuleCard
          title="Academics"
          description="Manage classes, sections, and credentials."
          icon={<BookOpen className="w-5 h-5 text-indigo-400" />}
          links={[
            { label: "Credentials & Passwords", href: "/admin/credentials", highlight: true },
            { label: "Student Directory", href: "/admin/students" },
            { label: "Academic Years", href: "/admin/academic-years" },
            { label: "Classes & Sections", href: "/admin/sections" },
          ]}
        />
        <ModuleCard
          title="Finance"
          description="Track dues, collections, and structures."
          icon={<Receipt className="w-5 h-5 text-emerald-400" />}
          links={[
            { label: "Outstanding Dues Breakdown", href: "/admin/fees/dues" },
            { label: "Fee Structures", href: "/admin/fees" },
          ]}
        />
        <ModuleCard
          title="System & Access"
          description="Staff directory, audit trails, and security."
          icon={<ShieldCheck className="w-5 h-5 text-purple-400" />}
          links={[
            { label: "Staff Directory & Roles", href: "/admin/staff" },
            { label: "System Audit Logs", href: "/admin/audit-logs" },
          ]}
        />
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon, href }: any) {
  const cardContent = (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-2 hover:border-slate-700 transition-all cursor-pointer">
      <div className="flex items-center justify-between text-slate-400">
        <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
        <div className="p-2 bg-slate-800 rounded-lg">{icon}</div>
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-xs text-slate-400">{subtitle}</div>
    </div>
  );

  return href ? <Link href={href}>{cardContent}</Link> : cardContent;
}

function ModuleCard({ title, description, icon, links }: any) {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-2.5 font-bold text-white text-base">
        <div className="p-2 bg-slate-800 rounded-lg">{icon}</div>
        {title}
      </div>
      <p className="text-xs text-slate-400">{description}</p>
      <div className="space-y-1.5 pt-2 border-t border-slate-800">
        {links.map((link: any, idx: number) => (
          <Link
            key={idx}
            href={link.href}
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              link.highlight
                ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {link.label}
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
          </Link>
        ))}
      </div>
    </div>
  );
}