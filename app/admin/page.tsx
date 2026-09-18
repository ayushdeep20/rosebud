// app/admin/page.tsx
import Link from "next/link";

const links = [
  { href: "/admin/academic-years", label: "Academic Years", desc: "Manage school years" },
  { href: "/admin/subjects", label: "Subjects", desc: "Manage subjects" },
  { href: "/admin/classes", label: "Classes", desc: "Manage classes" },
  { href: "/admin/sections", label: "Sections", desc: "Manage class sections" },
  { href: "/admin/students", label: "Students", desc: "Manage student records" },
  { href: "/admin/students/import", label: "Bulk Import", desc: "Import students from Excel" },
  { href: "/admin/students/reset-passwords", label: "Reset Passwords", desc: "Recover student credentials" },
  { href: "/admin/staff", label: "Staff", desc: "Manage teachers and staff" },
  { href: "/admin/assignments", label: "Assignments", desc: "Assign teachers to classes and subjects" },
  { href: "/admin/credentials", label: "Credentials", desc: "Manage staff portal passwords" },
];

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-semibold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition block"
          >
            <h2 className="font-medium text-rose-600">{l.label}</h2>
            <p className="text-sm text-gray-500 mt-1">{l.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}