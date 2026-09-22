import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { prisma } from "@/lib/prisma";

export default async function StudentDuesPage() {
  const dues = await prisma.feeDue.findMany({
    take: 50,
    include: { student: true },
    orderBy: { dueDate: "asc" },
  }).catch(() => []);

  return (
    <AdminPageShell
      title="Student Outstanding Dues"
      description="List of unpaid fee structures assigned to students."
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono">
            <tr>
              <th className="pb-3 px-2">Student</th>
              <th className="pb-3 px-2">Amount</th>
              <th className="pb-3 px-2">Due Date</th>
              <th className="pb-3 px-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {dues.length > 0 ? (
              dues.map((due: any) => (
                <tr key={due.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-2 font-medium text-slate-200">
                    {due.student?.firstName} {due.student?.lastName}
                  </td>
                  <td className="py-3 px-2 text-slate-200 font-semibold">${due.amount}</td>
                  <td className="py-3 px-2 text-slate-400">{new Date(due.dueDate).toLocaleDateString()}</td>
                  <td className="py-3 px-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {due.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500">
                  No unpaid fee entries present in the database.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminPageShell>
  );
}