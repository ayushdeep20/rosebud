"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  compareYearMonth,
  formatRupees,
  monthKey,
  monthLabel,
  monthsInRange,
  type YearMonth,
} from "@/lib/fees";

type AcademicYear = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
};

type SchoolClass = { id: string; name: string; order: number };

type ClassRow = {
  className: string;
  students: number;
  boarders: number;
  busUsers: number;
  linesToCreate: number;
  amountToCreate: number;
};

type TypeRow = { feeType: string; label: string; lines: number; amount: number };

type Result = {
  dryRun: boolean;
  academicYear: string;
  monthsSelected: string[];
  includeOneTime: boolean;
  totals: {
    students: number;
    linesToCreate: number;
    alreadyExist: number;
    amountToCreate: number;
  };
  byClass: ClassRow[];
  byType: TypeRow[];
  warnings: string[];
  created?: number;
};

export default function GenerateFeesPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState(""); // "" means all classes
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [includeOneTime, setIncludeOneTime] = useState(false);

  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState<"preview" | "generate" | null>(null);
  const [error, setError] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(true);

  const now = new Date();
  const currentYm: YearMonth = { month: now.getMonth() + 1, year: now.getFullYear() };

  const year = years.find((y) => y.id === academicYearId);

  const months = useMemo(
    () => (year ? monthsInRange(year.startDate, year.endDate) : []),
    [year]
  );

  function defaultSelection(list: YearMonth[]): string[] {
    // Start with the current month ticked (if it falls inside the year).
    return list.filter((m) => compareYearMonth(m, currentYm) === 0).map(monthKey);
  }

  useEffect(() => {
    async function loadOptions() {
      try {
        const [yearsRes, classesRes] = await Promise.all([
          fetch("/api/academic-years"),
          fetch("/api/classes"),
        ]);
        const yearsData: AcademicYear[] = await yearsRes.json();
        const classesData: SchoolClass[] = await classesRes.json();

        setYears(yearsData);
        setClasses(classesData);

        const current = yearsData.find((y) => y.isCurrent) ?? yearsData[0];
        if (current) {
          setAcademicYearId(current.id);
          const list = monthsInRange(current.startDate, current.endDate);
          const nowYm = new Date();
          const ym: YearMonth = { month: nowYm.getMonth() + 1, year: nowYm.getFullYear() };
          setSelectedKeys(list.filter((m) => compareYearMonth(m, ym) === 0).map(monthKey));
        }
      } catch (err) {
        console.error("Failed to load options", err);
        setError("Could not load academic years and classes.");
      } finally {
        setLoadingOptions(false);
      }
    }
    void loadOptions();
  }, []);

  function changeYear(id: string) {
    setAcademicYearId(id);
    setResult(null);
    const y = years.find((item) => item.id === id);
    setSelectedKeys(y ? defaultSelection(monthsInRange(y.startDate, y.endDate)) : []);
  }

  function toggleMonth(key: string) {
    setResult(null);
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function selectedMonthObjects(): YearMonth[] {
    return months.filter((m) => selectedKeys.includes(monthKey(m)));
  }

  const pastMonthsSelected = selectedMonthObjects().some(
    (m) => compareYearMonth(m, currentYm) < 0
  );

  async function run(dryRun: boolean) {
    setError("");
    setBusy(dryRun ? "preview" : "generate");
    try {
      const res = await fetch("/api/fees/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId,
          classId: classId || null,
          months: selectedMonthObjects(),
          includeOneTime,
          dryRun,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setResult(data as Result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  function confirmAndGenerate() {
    if (!result) return;
    const ok = window.confirm(
      `Create ${result.totals.linesToCreate} fee entries totalling ${formatRupees(
        result.totals.amountToCreate
      )}?\n\nExisting fees will not be changed.`
    );
    if (ok) void run(false);
  }

  const nothingSelected = selectedKeys.length === 0 && !includeOneTime;
  const done = result !== null && !result.dryRun;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">Generate Fees</h1>
        <Link href="/admin/fees" className="text-sm font-medium text-indigo-600 hover:underline">
          Back to Fee Collection
        </Link>
      </div>

      <div className="mb-6 space-y-6 rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Academic Year</label>
            <select
              value={academicYearId}
              onChange={(e) => changeYear(e.target.value)}
              disabled={loadingOptions}
              className="rounded-lg border px-3 py-2"
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label} {y.isCurrent ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Class</label>
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setResult(null);
              }}
              disabled={loadingOptions}
              className="rounded-lg border px-3 py-2"
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Monthly fees (Tuition, Hostel/Mess, Transport) - choose months
            </label>
            <div className="flex gap-3 text-xs">
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setSelectedKeys(months.map(monthKey));
                }}
                className="text-indigo-600 hover:underline"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setSelectedKeys([]);
                }}
                className="text-indigo-600 hover:underline"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {months.map((m) => {
              const key = monthKey(m);
              const checked = selectedKeys.includes(key);
              return (
                <label
                  key={key}
                  className={
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm " +
                    (checked ? "border-indigo-500 bg-indigo-50" : "border-gray-200")
                  }
                >
                  <input type="checkbox" checked={checked} onChange={() => toggleMonth(key)} />
                  {monthLabel(m)}
                </label>
              );
            })}
          </div>

          {pastMonthsSelected ? (
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              You selected months that have already passed. Students who paid for those months
              outside the portal will show as owing them. For a fresh start, generate from the
              current month onwards and use the imported previous dues for older balances.
            </p>
          ) : null}
        </div>

        <div>
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={includeOneTime}
              onChange={(e) => {
                setIncludeOneTime(e.target.checked);
                setResult(null);
              }}
              className="mt-1"
            />
            <span>
              <span className="font-medium">One-time fees for the year</span> - Annual fee for
              every student, plus Admission fee for students marked as newly admitted. Do this once
              per year, and only if these have not already been collected.
            </span>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => void run(true)}
            disabled={!academicYearId || nothingSelected || busy !== null}
            className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy === "preview" ? "Checking..." : "Preview"}
          </button>
        </div>

        {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      </div>

      {result ? (
        <div className="space-y-6">
          {done ? (
            <div className="rounded-xl bg-green-50 p-5 text-green-800">
              <p className="font-semibold">
                Done. Created {result.created ?? 0} fee entries totalling{" "}
                {formatRupees(result.totals.amountToCreate)}.
              </p>
              <p className="mt-1 text-sm">
                {result.totals.alreadyExist} entries already existed and were left unchanged.
              </p>
              <Link
                href="/admin/fees"
                className="mt-3 inline-block text-sm font-medium text-green-900 underline"
              >
                Go to Fee Collection
              </Link>
            </div>
          ) : (
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-lg font-semibold text-gray-800">Preview - nothing created yet</h2>
              <p className="mb-4 text-sm text-gray-600">
                {result.academicYear} -{" "}
                {result.monthsSelected.length > 0 ? result.monthsSelected.join(", ") : "no monthly fees"}
                {result.includeOneTime ? " + one-time fees" : ""}
              </p>

              <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Students</p>
                  <p className="text-xl font-semibold">{result.totals.students}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Entries to create</p>
                  <p className="text-xl font-semibold">{result.totals.linesToCreate}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Total amount</p>
                  <p className="text-xl font-semibold">{formatRupees(result.totals.amountToCreate)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">Already exist (skipped)</p>
                  <p className="text-xl font-semibold">{result.totals.alreadyExist}</p>
                </div>
              </div>

              {result.warnings.length > 0 ? (
                <div className="mb-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
                  <p className="mb-1 font-medium">Please check:</p>
                  <ul className="list-inside list-disc space-y-1">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 text-gray-600">
                      <tr>
                        <th className="px-4 py-2 font-medium">Class</th>
                        <th className="px-4 py-2 font-medium">Students</th>
                        <th className="px-4 py-2 font-medium">Hostel</th>
                        <th className="px-4 py-2 font-medium">Bus</th>
                        <th className="px-4 py-2 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {result.byClass.map((c) => (
                        <tr key={c.className}>
                          <td className="px-4 py-2">{c.className}</td>
                          <td className="px-4 py-2">{c.students}</td>
                          <td className="px-4 py-2">{c.boarders}</td>
                          <td className="px-4 py-2">{c.busUsers}</td>
                          <td className="px-4 py-2 text-right">{formatRupees(c.amountToCreate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 text-gray-600">
                      <tr>
                        <th className="px-4 py-2 font-medium">Fee type</th>
                        <th className="px-4 py-2 font-medium">Entries</th>
                        <th className="px-4 py-2 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {result.byType.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-gray-500">
                            Nothing new to create.
                          </td>
                        </tr>
                      ) : (
                        result.byType.map((t) => (
                          <tr key={t.feeType}>
                            <td className="px-4 py-2">{t.label}</td>
                            <td className="px-4 py-2">{t.lines}</td>
                            <td className="px-4 py-2 text-right">{formatRupees(t.amount)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={confirmAndGenerate}
                  disabled={busy !== null || result.totals.linesToCreate === 0}
                  className="rounded-lg bg-emerald-600 px-6 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {busy === "generate" ? "Creating..." : "Create these fees"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}