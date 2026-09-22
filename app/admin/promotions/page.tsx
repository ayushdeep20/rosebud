"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

type AcademicYear = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
};

type TargetSection = {
  id: string;
  name: string;
};

type PromotionGroup = {
  sourceSectionId: string;
  sourceClassName: string;
  sourceSectionName: string;
  studentCount: number;

  targetClassId: string | null;
  targetClassName: string | null;
  targetSectionId: string | null;

  targetSections: TargetSection[];

  promotable: boolean;
  reason?: string;
};

type PreviewResponse = {
  sourceYear: { id: string; label: string };
  targetYear: { id: string; label: string };
  groups: PromotionGroup[];
  totalStudents: number;
};

type PromotionSuccess = {
  success: true;
  created: number;
  sourceStudents: number;
  sourceAcademicYear: string;
  targetAcademicYear: string;
};

type PromotionError = {
  error: string;
  conflicts?: {
    studentId: string;
    studentName: string;
    currentTargetClass: string;
    currentTargetSection: string;
  }[];
};

export default function PromotionsPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);

  const [sourceYearId, setSourceYearId] = useState("");
  const [targetYearId, setTargetYearId] = useState("");

  const [groups, setGroups] = useState<PromotionGroup[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);

  const [loadingYears, setLoadingYears] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [promoting, setPromoting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState<PromotionSuccess | null>(null);
  const [conflicts, setConflicts] = useState<PromotionError["conflicts"]>([]);

  // Load academic years
  useEffect(() => {
    const controller = new AbortController();

    async function loadYears() {
      setLoadingYears(true);
      setError("");

      try {
        const response = await fetch("/api/academic-years", { signal: controller.signal });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load academic years.");
        }

        const loadedYears = data as AcademicYear[];
        setYears(loadedYears);

        if (loadedYears.length === 0) return;

        const sorted = [...loadedYears].sort(
          (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );

        if (sorted.length >= 2) {
          setSourceYearId(sorted[sorted.length - 2].id);
          setTargetYearId(sorted[sorted.length - 1].id);
        } else {
          setSourceYearId(sorted[0].id);
          setTargetYearId("");
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load academic years.");
      } finally {
        setLoadingYears(false);
      }
    }

    void loadYears();
    return () => controller.abort();
  }, []);

  // Fetch promotion preview
  const loadPreview = useCallback(
    async (signal?: AbortSignal) => {
      if (!sourceYearId || !targetYearId) {
        setGroups([]);
        setTotalStudents(0);
        return;
      }

      if (sourceYearId === targetYearId) {
        setGroups([]);
        setTotalStudents(0);
        setError("Source and target academic years must be different.");
        return;
      }

      setLoadingPreview(true);
      setError("");
      setSuccess(null);
      setConflicts([]);

      try {
        const url =
          `/api/admin/promotions` +
          `?sourceYearId=${encodeURIComponent(sourceYearId)}` +
          `&targetYearId=${encodeURIComponent(targetYearId)}`;

        const response = await fetch(url, { signal });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to build promotion preview.");
        }

        const preview = data as PreviewResponse;
        setGroups(preview.groups);
        setTotalStudents(preview.totalStudents);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setGroups([]);
        setTotalStudents(0);
        setError(err instanceof Error ? err.message : "Failed to build promotion preview.");
      } finally {
        setLoadingPreview(false);
      }
    },
    [sourceYearId, targetYearId]
  );

  useEffect(() => {
    if (!sourceYearId || !targetYearId || sourceYearId === targetYearId) {
      setGroups([]);
      setTotalStudents(0);
      return;
    }

    const controller = new AbortController();
    void loadPreview(controller.signal);
    return () => controller.abort();
  }, [sourceYearId, targetYearId, loadPreview]);

  const promotableGroups = useMemo(() => groups.filter((g) => g.promotable), [groups]);
  const nonPromotableGroups = useMemo(() => groups.filter((g) => !g.promotable), [groups]);

  const promotableStudentCount = useMemo(
    () => promotableGroups.reduce((acc, g) => acc + g.studentCount, 0),
    [promotableGroups]
  );

  const handleTargetSectionChange = (sourceSectionId: string, targetSectionId: string) => {
    setGroups((current) =>
      current.map((group) =>
        group.sourceSectionId === sourceSectionId ? { ...group, targetSectionId } : group
      )
    );

    setError("");
    setSuccess(null);
    setConflicts([]);
  };

  const handlePromote = async () => {
    setError("");
    setSuccess(null);
    setConflicts([]);

    const groupWithoutDestination = promotableGroups.find((g) => !g.targetSectionId);
    if (groupWithoutDestination) {
      setError(
        `Choose a destination section for ${groupWithoutDestination.sourceClassName} — Section ${groupWithoutDestination.sourceSectionName}.`
      );
      return;
    }

    if (promotableStudentCount === 0) {
      setError("There are no students available to promote.");
      return;
    }

    const sourceYear = years.find((y) => y.id === sourceYearId);
    const targetYear = years.find((y) => y.id === targetYearId);

    const confirmed = window.confirm(
      `Promote ${promotableStudentCount} student(s) from ${
        sourceYear?.label ?? "source year"
      } to ${targetYear?.label ?? "target year"}?\n\nExisting academic history will not be changed.`
    );

    if (!confirmed) return;

    setPromoting(true);

    try {
      const response = await fetch("/api/admin/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceYearId,
          targetYearId,
          mappings: promotableGroups.map((g) => ({
            sourceSectionId: g.sourceSectionId,
            targetSectionId: g.targetSectionId,
          })),
        }),
      });

      const data = (await response.json()) as PromotionSuccess | PromotionError;

      if (!response.ok) {
        const failure = data as PromotionError;
        if (failure.conflicts) setConflicts(failure.conflicts);
        throw new Error(failure.error ?? "Promotion failed.");
      }

      setSuccess(data as PromotionSuccess);
      await loadPreview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Promotion failed.");
    } finally {
      setPromoting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-semibold mb-2">Promote Students</h1>
      <p className="text-gray-500 mb-6 max-w-3xl">
        Move students into the next academic year while preserving all previous academic history.
      </p>

      {/* Academic Year Selection */}
      <div className="bg-white rounded-xl shadow-md p-6 max-w-3xl mb-6">
        <h2 className="text-lg font-medium mb-4">Academic Years</h2>

        {loadingYears ? (
          <p className="text-sm text-gray-500">Loading academic years...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="source-year">
                Promote From
              </label>
              <select
                id="source-year"
                value={sourceYearId}
                onChange={(e) => {
                  setSourceYearId(e.target.value);
                  setError("");
                  setSuccess(null);
                  setConflicts([]);
                }}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select source year</option>
                {years.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="target-year">
                Promote To
              </label>
              <select
                id="target-year"
                value={targetYearId}
                onChange={(e) => {
                  setTargetYearId(e.target.value);
                  setError("");
                  setSuccess(null);
                  setConflicts([]);
                }}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select target year</option>
                {years.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-4">
          The target academic year must be later than the source academic year.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-3xl mb-6 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-3xl mb-6 text-sm text-green-700">
          <p className="font-medium">Promotion completed successfully.</p>
          <p className="mt-1">
            {success.created} enrollment{success.created === 1 ? "" : "s"} created for {success.targetAcademicYear}.
          </p>
        </div>
      )}

      {conflicts && conflicts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-3xl mb-6 text-sm text-amber-800">
          <p className="font-medium mb-2">Some students already have target-year enrollments.</p>
          <p className="mb-3">Nothing was changed for this promotion batch.</p>
          <ul className="space-y-1">
            {conflicts.slice(0, 20).map((conflict) => (
              <li key={conflict.studentId}>
                {conflict.studentName} — {conflict.currentTargetClass} {conflict.currentTargetSection}
              </li>
            ))}
          </ul>
          {conflicts.length > 20 && (
            <p className="mt-2 text-xs">And {conflicts.length - 20} more.</p>
          )}
        </div>
      )}

      {/* Preview Section */}
      {loadingPreview ? (
        <div className="bg-white rounded-xl shadow-md p-6 max-w-3xl">
          <p className="text-sm text-gray-500">Building promotion preview...</p>
        </div>
      ) : groups.length > 0 ? (
        <div className="bg-white rounded-xl shadow-md p-6 max-w-3xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-medium">Promotion Preview</h2>
              <p className="text-sm text-gray-500 mt-1">
                {totalStudents} students found in the source academic year.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handlePromote()}
              disabled={promoting || promotableStudentCount === 0}
              className="bg-rose-500 text-white rounded-lg px-4 py-2 font-medium hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {promoting ? "Promoting..." : `Promote ${promotableStudentCount} Students`}
            </button>
          </div>

          <div className="space-y-4">
            {promotableGroups.map((group) => (
              <div key={group.sourceSectionId} className="border rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4">
                  <div>
                    <p className="font-medium">
                      {group.sourceClassName} — Section {group.sourceSectionName}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {group.studentCount} student{group.studentCount === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="text-gray-400 text-center">→</div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Destination
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 border rounded-lg px-3 py-2 bg-gray-50 text-sm">
                        {group.targetClassName}
                      </div>

                      <select
                        value={group.targetSectionId ?? ""}
                        onChange={(e) =>
                          handleTargetSectionChange(group.sourceSectionId, e.target.value)
                        }
                        className="border rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">Select section</option>
                        {group.targetSections.map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            Section {sec.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {nonPromotableGroups.length > 0 && (
            <div className="mt-6 border-t pt-5">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Not automatically promotable
              </h3>
              <ul className="text-sm text-gray-500 space-y-1">
                {nonPromotableGroups.map((group) => (
                  <li key={group.sourceSectionId}>
                    {group.sourceClassName} — Section {group.sourceSectionName} ({group.studentCount}{" "}
                    students): {group.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : sourceYearId && targetYearId ? (
        <div className="bg-white rounded-xl shadow-md p-6 max-w-3xl">
          <p className="text-sm text-gray-500">
            No students were found in the selected source academic year.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md p-6 max-w-3xl">
          <p className="text-sm text-gray-500">
            Select the source and target academic years to preview the promotion.
          </p>
        </div>
      )}
    </div>
  );
}