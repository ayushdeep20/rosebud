// app/admin/staff/page.tsx
"use client";

import { useEffect, useState } from "react";

type StaffMember = {
  id: string;
  staffCode: string;
  firstName: string;
  lastName: string;
  designation: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  user: { username: string } | null;
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [designation, setDesignation] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dateOfJoining, setDateOfJoining] = useState("");
  const [createLogin, setCreateLogin] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{
    username: string;
    tempPassword: string;
  } | null>(null);

  const loadStaff = async () => {
    const res = await fetch("/api/staff");
    const data = await res.json();
    setStaff(data);
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCreated(null);
    setLoading(true);

    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        designation,
        phone,
        email,
        dateOfJoining,
        createLogin,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
      return;
    }

    const data = await res.json();
    if (data.username) {
      setCreated({
        username: data.username,
        tempPassword: data.tempPassword,
      });
    }

    setFirstName("");
    setLastName("");
    setDesignation("");
    setPhone("");
    setEmail("");
    setDateOfJoining("");
    loadStaff();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-semibold mb-6">Staff Management</h1>

      <div className="bg-white rounded-xl shadow-md p-6 max-w-2xl mb-8">
        <h2 className="text-lg font-medium mb-4">Add Staff Member</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Designation (e.g. Mathematics Teacher, Office Staff)
            </label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Date of Joining
            </label>
            <input
              type="date"
              value={dateOfJoining}
              onChange={(e) => setDateOfJoining(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="createLogin"
              checked={createLogin}
              onChange={(e) => setCreateLogin(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="createLogin" className="text-sm">
              Create portal login for this staff member
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-rose-500 text-white rounded-lg px-4 py-2 font-medium hover:bg-rose-600 disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add Staff Member"}
          </button>
        </form>

        {created && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
            <p className="font-medium text-green-800">
              Staff member created with portal login.
            </p>
            <p className="mt-1">
              Username:{" "}
              <span className="font-mono">{created.username}</span>
            </p>
            <p>
              Temporary password:{" "}
              <span className="font-mono">{created.tempPassword}</span>
            </p>
            <p className="mt-1 text-gray-600">
              Share this now — it won&apos;t be shown again.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 max-w-2xl">
        <h2 className="text-lg font-medium mb-4">All Staff</h2>
        {staff.length === 0 ? (
          <p className="text-gray-500 text-sm">No staff members yet.</p>
        ) : (
          <ul className="space-y-2">
            {staff.map((s) => (
              <li
                key={s.id}
                className="flex justify-between border-b pb-2 text-sm"
              >
                <div>
                  <span className="font-medium">
                    {s.firstName} {s.lastName}
                  </span>
                  <span className="text-gray-500 ml-2">({s.staffCode})</span>
                  <span className="text-gray-400 ml-2">— {s.designation}</span>
                </div>
                <div className="text-gray-400">
                  {s.user ? (
                    <span className="text-green-600">Has login</span>
                  ) : (
                    <span>No login</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}