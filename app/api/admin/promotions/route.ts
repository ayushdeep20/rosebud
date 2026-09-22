import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/audit";

type PromotionMapping = {
  sourceSectionId: string;
  targetSectionId: string;
};

type PromotionGroup = {
  sourceSectionId: string;
  sourceClassId: string;
  sourceClassName: string;
  sourceClassOrder: number;
  sourceSectionName: string;
  studentCount: number;

  targetClassId: string | null;
  targetClassName: string | null;
  targetSectionId: string | null;

  targetSections: {
    id: string;
    name: string;
  }[];

  promotable: boolean;
  reason?: string;
};

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !requireAdmin(session)) {
    return forbidden();
  }

  const { searchParams } = new URL(request.url);
  const sourceYearId = searchParams.get("sourceYearId");
  const targetYearId = searchParams.get("targetYearId");

  if (!sourceYearId || !targetYearId) {
    return badRequest("sourceYearId and targetYearId are required.");
  }

  if (sourceYearId === targetYearId) {
    return badRequest("Source and target academic years must be different.");
  }

  const [sourceYear, targetYear, classes] = await Promise.all([
    prisma.academicYear.findUnique({ where: { id: sourceYearId } }),
    prisma.academicYear.findUnique({ where: { id: targetYearId } }),
    prisma.schoolClass.findMany({ orderBy: { order: "asc" } }),
  ]);

  if (!sourceYear || !targetYear) {
    return NextResponse.json({ error: "Academic year not found." }, { status: 404 });
  }

  if (targetYear.startDate <= sourceYear.startDate) {
    return badRequest(
      "The target academic year must be later than the source academic year."
    );
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { academicYearId: sourceYearId },
    select: {
      section: {
        select: {
          id: true,
          name: true,
          schoolClass: { select: { id: true, name: true, order: true } },
        },
      },
    },
    orderBy: [
      { section: { schoolClass: { order: "asc" } } },
      { section: { name: "asc" } },
    ],
  });

  const groups = new Map<
    string,
    {
      sectionId: string;
      classId: string;
      className: string;
      classOrder: number;
      sectionName: string;
      studentCount: number;
    }
  >();

  for (const enrollment of enrollments) {
    const section = enrollment.section;
    if (!groups.has(section.id)) {
      groups.set(section.id, {
        sectionId: section.id,
        classId: section.schoolClass.id,
        className: section.schoolClass.name,
        classOrder: section.schoolClass.order,
        sectionName: section.name,
        studentCount: 0,
      });
    }
    groups.get(section.id)!.studentCount += 1;
  }

  const classIndexById = new Map(classes.map((c, index) => [c.id, index]));

  const nextClassIds = classes
    .map((_, index) => (index >= classes.length - 1 ? null : classes[index + 1].id))
    .filter((id): id is string => id !== null);

  const targetSections = await prisma.section.findMany({
    where: { schoolClassId: { in: nextClassIds } },
    select: {
      id: true,
      name: true,
      schoolClassId: true,
    },
    orderBy: [
      { schoolClass: { order: "asc" } },
      { name: "asc" },
    ],
  });

  const sectionsByClassId = new Map<string, { id: string; name: string }[]>();
  for (const section of targetSections) {
    const existing = sectionsByClassId.get(section.schoolClassId) ?? [];
    existing.push({ id: section.id, name: section.name });
    sectionsByClassId.set(section.schoolClassId, existing);
  }

  const promotionGroups: PromotionGroup[] = [];

  for (const group of groups.values()) {
    const sourceClassIndex = classIndexById.get(group.classId);

    if (sourceClassIndex === undefined || sourceClassIndex >= classes.length - 1) {
      promotionGroups.push({
        sourceSectionId: group.sectionId,
        sourceClassId: group.classId,
        sourceClassName: group.className,
        sourceClassOrder: group.classOrder,
        sourceSectionName: group.sectionName,
        studentCount: group.studentCount,

        targetClassId: null,
        targetClassName: null,
        targetSectionId: null,
        targetSections: [],

        promotable: false,
        reason: "There is no next class configured for this class.",
      });
      continue;
    }

    const nextClass = classes[sourceClassIndex + 1];
    const possibleSections = sectionsByClassId.get(nextClass.id) ?? [];

    const matchingSection =
      possibleSections.find((s) => s.name === group.sectionName) ??
      possibleSections[0] ??
      null;

    promotionGroups.push({
      sourceSectionId: group.sectionId,
      sourceClassId: group.classId,
      sourceClassName: group.className,
      sourceClassOrder: group.classOrder,
      sourceSectionName: group.sectionName,
      studentCount: group.studentCount,

      targetClassId: nextClass.id,
      targetClassName: nextClass.name,
      targetSectionId: matchingSection?.id ?? null,
      targetSections: possibleSections,

      promotable: possibleSections.length > 0,
      reason:
        possibleSections.length === 0
          ? `No sections exist under ${nextClass.name}.`
          : undefined,
    });
  }

  return NextResponse.json({
    sourceYear: { id: sourceYear.id, label: sourceYear.label },
    targetYear: { id: targetYear.id, label: targetYear.label },
    groups: promotionGroups,
    totalStudents: enrollments.length,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !requireAdmin(session)) {
    return forbidden();
  }

  let body: {
    sourceYearId?: string;
    targetYearId?: string;
    mappings?: PromotionMapping[];
  };

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON request.");
  }

  const { sourceYearId, targetYearId, mappings } = body;

  if (!sourceYearId || !targetYearId || !Array.isArray(mappings)) {
    return badRequest("sourceYearId, targetYearId, and mappings are required.");
  }

  if (sourceYearId === targetYearId) {
    return badRequest("Source and target academic years must be different.");
  }

  if (mappings.length === 0) {
    return badRequest("At least one promotion mapping is required.");
  }

  const uniqueMappingsMap = new Map<string, string>();
  for (const m of mappings) {
    if (m?.sourceSectionId && m?.targetSectionId) {
      uniqueMappingsMap.set(m.sourceSectionId, m.targetSectionId);
    }
  }

  const uniqueMappings: PromotionMapping[] = Array.from(uniqueMappingsMap.entries()).map(
    ([sourceSectionId, targetSectionId]) => ({ sourceSectionId, targetSectionId })
  );

  const [sourceYear, targetYear] = await Promise.all([
    prisma.academicYear.findUnique({ where: { id: sourceYearId } }),
    prisma.academicYear.findUnique({ where: { id: targetYearId } }),
  ]);

  if (!sourceYear || !targetYear) {
    return NextResponse.json({ error: "Academic year not found." }, { status: 404 });
  }

  if (targetYear.startDate <= sourceYear.startDate) {
    return badRequest("The target academic year must be later than the source academic year.");
  }

  const sourceSectionIds = uniqueMappings.map((m) => m.sourceSectionId);
  const targetSectionIds = uniqueMappings.map((m) => m.targetSectionId);

  const [sourceSections, targetSections, classes] = await Promise.all([
    prisma.section.findMany({
      where: { id: { in: sourceSectionIds } },
      include: { schoolClass: true },
    }),
    prisma.section.findMany({
      where: { id: { in: targetSectionIds } },
      include: { schoolClass: true },
    }),
    prisma.schoolClass.findMany({ orderBy: { order: "asc" } }),
  ]);

  if (sourceSections.length !== sourceSectionIds.length) {
    return badRequest("One or more source sections could not be found.");
  }

  if (targetSections.length !== targetSectionIds.length) {
    return badRequest("One or more target sections could not be found.");
  }

  const sourceSectionMap = new Map(sourceSections.map((s) => [s.id, s]));
  const targetSectionMap = new Map(targetSections.map((s) => [s.id, s]));
  const classIndexById = new Map(classes.map((c, index) => [c.id, index]));

  for (const mapping of uniqueMappings) {
    const sourceSection = sourceSectionMap.get(mapping.sourceSectionId);
    const targetSection = targetSectionMap.get(mapping.targetSectionId);

    if (!sourceSection || !targetSection) {
      return badRequest("Invalid promotion mapping.");
    }

    const sourceIndex = classIndexById.get(sourceSection.schoolClassId);
    const targetIndex = classIndexById.get(targetSection.schoolClassId);

    if (sourceIndex === undefined || targetIndex === undefined) {
      return badRequest("Invalid class mapping.");
    }

    if (targetIndex !== sourceIndex + 1) {
      return badRequest(
        `${sourceSection.schoolClass.name} can only be promoted to the next configured class.`
      );
    }
  }

  const sourceEnrollments = await prisma.enrollment.findMany({
    where: {
      academicYearId: sourceYearId,
      sectionId: { in: sourceSectionIds },
    },
    select: {
      studentId: true,
      sectionId: true,
      rollNumber: true,
    },
  });

  if (sourceEnrollments.length === 0) {
    return badRequest("No students were found in the selected source sections.");
  }

  const studentIds = [...new Set(sourceEnrollments.map((e) => e.studentId))];

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingTargetEnrollments = await tx.enrollment.findMany({
        where: {
          academicYearId: targetYearId,
          studentId: { in: studentIds },
        },
        include: {
          student: { select: { firstName: true, lastName: true } },
          section: { include: { schoolClass: { select: { name: true } } } },
        },
      });

      if (existingTargetEnrollments.length > 0) {
        const conflicts = existingTargetEnrollments.map((e) => ({
          studentId: e.studentId,
          studentName: `${e.student.firstName} ${e.student.lastName}`,
          currentTargetClass: e.section.schoolClass.name,
          currentTargetSection: e.section.name,
        }));

        throw { isConflict: true, conflicts };
      }

      const newEnrollments = sourceEnrollments.map((e) => {
        const targetSecId = uniqueMappingsMap.get(e.sectionId);
        if (!targetSecId) {
          throw new Error(`Missing target section for ${e.sectionId}`);
        }
        return {
          studentId: e.studentId,
          academicYearId: targetYearId,
          sectionId: targetSecId,
          rollNumber: e.rollNumber,
        };
      });

      const batchResult = await tx.enrollment.createMany({
        data: newEnrollments,
        skipDuplicates: false,
      });

      await recordAudit(tx, {
        actorUserId: session.user.id,
        action: "STUDENTS_PROMOTE",
        entityType: "AcademicYear",
        entityId: targetYearId,
        after: {
          sourceYearId,
          promotedCount: batchResult.count,
        },
      });

      return batchResult.count;
    });

    return NextResponse.json({
      success: true,
      created: result,
      sourceStudents: sourceEnrollments.length,
      sourceAcademicYear: sourceYear.label,
      targetAcademicYear: targetYear.label,
    });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "isConflict" in err &&
      "conflicts" in err
    ) {
      const conflictErr = err as { isConflict: boolean; conflicts: unknown[] };
      return NextResponse.json(
        {
          error:
            "Some students already have an enrollment in the target academic year. Nothing was changed.",
          conflicts: conflictErr.conflicts,
        },
        { status: 409 }
      );
    }

    console.error("Student promotion failed:", err);
    return NextResponse.json(
      { error: "Promotion failed. No promotion was completed." },
      { status: 500 }
    );
  }
}