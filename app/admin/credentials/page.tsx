// app/admin/credentials/page.tsx
"use client";

import { useEffect, useState } from "react";

type StaffMember = {
  id: string;
  staffCode: string;
  firstName: string;
  lastName: string;
  designation: string;
  userId: string | null;
  user: { id: string; username: string } | null;
};

type ResetResult = {
  staffCode: string;
  name: string;
  username: string;
  tempPassword: string;
};

export default function CredentialsPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [bulkResults, setBulkResults] = useState<ResetResult[] | null>(null);
  const [singleReset, setSingleReset] = useState<{
    username: string;
    tempPassword: string;
  } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [singleLoadingId, setSingleLoadingId] = useState<string | null>(null);

  const loadStaff = async () => {
    const res = await fetch("/api/staff");
    const data = await res.json();
    setStaff(data);
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleBulkReset = async () => {
    if (
      !confirm(
        "This will reset passwords for ALL staff members with a portal login. Continue?"
      )
    )
      return;

    setBulkLoading(true);
    setBulkResults(null);
    setSingleReset(null);

    const res = await fetch("/api/admin/reset-staff-passwords", {
      method: "POST",
    });

    setBulkLoading(false);

    if (res.ok) {
      const data = await res.json();
      setBulkResults(data.results);
    }
  };

  const handleSingleReset = async (userId: string, username: string) => {
    setSingleLoadingId(userId);
    setSingleReset(null);

    const res = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    setSingleLoadingId(null);

    if (res.ok) {
      const data = await res.json();
      setSingleReset({ username, tempPassword: data.tempPassword });
    }
  };

  const downloadCsv = () => {
    if (!bulkResults) return;
    const header = "staffCode,name,username,tempPassword\n";
    const rows = bulkResults
      .map((r) => `${r.staffCode},${r.name},${r.username},${r.tempPassword}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "staff-credentials.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-semibold mb-6">
        Staff Credentials & Password Management
      </h1>

      {/* Bulk reset section */}
      <div className="bg-white rounded-xl shadow-md p-6 max-w-3xl mb-8">
        <h2 className="text-lg font-medium mb-2">Bulk Password Reset</h2>
        <p className="text-sm text-gray-500 mb-4">
          Resets passwords for all staff with a portal login at once. Use this
          if you need to redistribute credentials to the whole team.
        </p>
        <button
          onClick={handleBulkReset}
          disabled={bulkLoading}
          className="bg-rose-500 text-white rounded-lg px-4 py-2 font-medium hover:bg-rose-600 disabled:opacity-50"
        >
          {bulkLoading ? "Resetting all..." : "Reset All Staff Passwords"}
        </button>

        {bulkResults && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-green-700">
                {bulkResults.length} passwords reset.
              </p>
              <button
                onClick={downloadCsv}
                className="bg-green-600 text-white rounded-lg px-3 py-1.5 text-sm hover:bg-green-700"
              >
                Download CSV
              </button>
            </div>
            <p className="text-xs text-amber-600 mb-2">
              Save this list now — it won&apos;t be shown again.
            </p>
            <div className="max-h-48 overflow-y-auto text-xs font-mono border rounded p-2">
              {bulkResults.map((r) => (
                <div key={r.staffCode} className="py-0.5">
                  {r.staffCode} — {r.name} — {r.username} — {r.tempPassword}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Single reset section */}
      <div className="bg-white rounded-xl shadow-md p-6 max-w-3xl">
        <h2 className="text-lg font-medium mb-4">
          Individual Password Reset
        </h2>

        {singleReset && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
            <p className="font-medium text-green-800">Password reset.</p>
            <p>
              Username:{" "}
              <span className="font-mono">{singleReset.username}</span>
            </p>
            <p>
              New password:{" "}
              <span className="font-mono">{singleReset.tempPassword}</span>
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Share this now — it won&apos;t be shown again.
            </p>
          </div>
        )}

        {staff.filter((s) => s.user).length === 0 ? (
          <p className="text-gray-500 text-sm">
            No staff members with portal logins yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {staff
              .filter((s) => s.user)
              .map((s) => (
                <li
                  key={s.id}
                  className="flex justify-between items-center border-b pb-2 text-sm"
                >
                  <div>
                    <span className="font-medium">
                      {s.firstName} {s.lastName}
                    </span>
                    <span className="text-gray-400 ml-2">
                      — {s.designation}
                    </span>
                    <span className="text-gray-400 ml-2 font-mono text-xs">
                      ({s.user!.username})
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      handleSingleReset(s.user!.id, s.user!.username)
                    }
                    disabled={singleLoadingId === s.user!.id}
                    className="text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded px-2 py-1 hover:bg-rose-100 disabled:opacity-50"
                  >
                    {singleLoadingId === s.user!.id
                      ? "Resetting..."
                      : "Reset Password"}
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}