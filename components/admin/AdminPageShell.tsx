import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface AdminPageShellProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function AdminPageShell({
  title,
  description,
  action,
  children,
}: AdminPageShellProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-400 transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Command Center
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
        {action && <div>{action}</div>}
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}