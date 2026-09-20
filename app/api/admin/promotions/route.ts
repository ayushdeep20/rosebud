// app/api/admin/promotions/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
  return NextResponse.json(
    { error: "Forbidden" },
    { status: 403 }
  );
}

function badRequest(message: string) {
  return NextResponse.json(
    { error: message },
    { status: 400 }
  );
}

/**
 * GET
 *
 * Returns the current source-year student groups and automatically
 * suggests the next academic class for each group.
 *
 * Example:
 *
 * Class 8 — A
 *      ↓
 * Class 9 — A
 */
export async function GET(request: Request) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
    return forbidden();
  }

  const { searchParams } = new URL(request.url);

  const sourceYearId = searchParams.get("sourceYearId");
  const targetYearId = searchParams.get("targetYearId");

  if (!sourceYearId || !targetYearId) {
    return badRequest(
      "sourceYearId and targetYearId are required."
    );
  }

  if (sourceYearId === targetYearId) {
    return badRequest(
      "Source and target academic years must be different."
    );
  }

  const [sourceYear, targetYear, classes] =
    await Promise.all([
      prisma.academicYear.findUnique({
        where: {
          id: sourceYearId,
        },
      }),
      prisma.academicYear.findUnique({
        where: {
          id: targetYearId,
        },
      }),
      prisma.schoolClass.findMany({
        orderBy: {
          order: "asc",
        },
      }),
    ]);

  if (!sourceYear || !targetYear) {
    return NextResponse.json(
      {
        error: "Academic year not found.",
      },
      { status: 404 }
    );
  }

  if (targetYear.startDate <= sourceYear.startDate) {
    return badRequest(
      "The target academic year must be later than the source academic year."
    );
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      academicYearId: sourceYearId,
    },
    include: {
      section: {
        include: {
          schoolClass: true,
        },
      },
    },
    orderBy: [
      {
        section: {
          schoolClass: {
            order: "asc",
          },
        },
      },
      {
        section: {
          name: "asc",
        },
      },
      {
        rollNumber: "asc",
      },
    ],
  });

  /**
   * Group enrollments by section.
   *
   * A section belongs to one SchoolClass, so this gives us:
   *
   * Class 8 - A → 55 students
   * Class 9 - A → 50 students
   */
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

    const group = groups.get(section.id)!;
    group.studentCount += 1;
  }

  /**
   * Find the next class based on the sorted class list.
   *
   * We intentionally do NOT use order + 1 because:
   *
   * LKG = -2
   * UKG = -1
   * Class 1 = 1
   *
   * There is no class with order 0.
   *
   * Instead:
   *
   * LKG  → next item → UKG
   * UKG  → next item → Class 1
   * Class 1 → next item → Class 2
   */
  const classIndexById = new Map(
    classes.map((schoolClass, index) => [
      schoolClass.id,
      index,
    ])
  );

  /**
   * Find all sections in all possible target classes.
   */
  const nextClassIds = classes
    .map((schoolClass, index) => {
      if (index >= classes.length - 1) {
        return null;
      }

      return classes[index + 1].id;
    })
    .filter(
      (id): id is string => id !== null
    );

  const targetSections = await prisma.section.findMany({
    where: {
      schoolClassId: {
        in: nextClassIds,
      },
    },
    include: {
      schoolClass: true,
    },
    orderBy: [
      {
        schoolClass: {
          order: "asc",
        },
      },
      {
        name: "asc",
      },
    ],
  });

  const sectionsByClassId = new Map<
    string,
    {
      id: string;
      name: string;
    }[]
  >();

  for (const section of targetSections) {
    const existing =
      sectionsByClassId.get(section.schoolClassId) ?? [];

    existing.push({
      id: section.id,
      name: section.name,
    });

    sectionsByClassId.set(
      section.schoolClassId,
      existing
    );
  }

  const promotionGroups: PromotionGroup[] = [];

  for (const group of groups.values()) {
    const sourceClassIndex = classIndexById.get(
      group.classId
    );

    if (
      sourceClassIndex === undefined ||
      sourceClassIndex >= classes.length - 1
    ) {
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
        reason:
          "There is no next class configured for this class.",
      });

      continue;
    }

    const nextClass =
      classes[sourceClassIndex + 1];

    const possibleSections =
      sectionsByClassId.get(nextClass.id) ?? [];

    /**
     * Prefer a section with the same name.
     *
     * Class 8-A → Class 9-A
     *
     * If the matching section does not exist,
     * fall back to the first available section.
     */
    const matchingSection =
      possibleSections.find(
        (section) =>
          section.name === group.sectionName
      ) ??
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
    sourceYear: {
      id: sourceYear.id,
      label: sourceYear.label,
    },
    targetYear: {
      id: targetYear.id,
      label: targetYear.label,
    },
    groups: promotionGroups,
    totalStudents: enrollments.length,
  });
}

/**
 * POST
 *
 * Creates the target-year Enrollment rows.
 *
 * Existing source-year enrollments are NEVER changed.
 *
 * Existing target-year enrollments are treated as conflicts
 * and the whole promotion is stopped rather than partially
 * changing the student's academic history.
 */
export async function POST(request: Request) {
  const session = await auth();

  if (session?.user?.role !== "ADMIN") {
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

  const {
    sourceYearId,
    targetYearId,
    mappings,
  } = body;

  if (
    !sourceYearId ||
    !targetYearId ||
    !Array.isArray(mappings)
  ) {
    return badRequest(
      "sourceYearId, targetYearId, and mappings are required."
    );
  }

  if (sourceYearId === targetYearId) {
    return badRequest(
      "Source and target academic years must be different."
    );
  }

  if (mappings.length === 0) {
    return badRequest(
      "At least one promotion mapping is required."
    );
  }

  const [sourceYear, targetYear] =
    await Promise.all([
      prisma.academicYear.findUnique({
        where: {
          id: sourceYearId,
        },
      }),
      prisma.academicYear.findUnique({
        where: {
          id: targetYearId,
        },
      }),
    ]);

  if (!sourceYear || !targetYear) {
    return NextResponse.json(
      {
        error: "Academic year not found.",
      },
      { status: 404 }
    );
  }

  if (targetYear.startDate <= sourceYear.startDate) {
    return badRequest(
      "The target academic year must be later than the source academic year."
    );
  }

  const sourceSectionIds = [
    ...new Set(
      mappings.map(
        (mapping) => mapping.sourceSectionId
      )
    ),
  ];

  const targetSectionIds = [
    ...new Set(
      mappings.map(
        (mapping) => mapping.targetSectionId
      )
    ),
  ];

  const [sourceSections, targetSections] =
    await Promise.all([
      prisma.section.findMany({
        where: {
          id: {
            in: sourceSectionIds,
          },
        },
        include: {
          schoolClass: true,
        },
      }),
      prisma.section.findMany({
        where: {
          id: {
            in: targetSectionIds,
          },
        },
        include: {
          schoolClass: true,
        },
      }),
    ]);

  if (
    sourceSections.length !==
    sourceSectionIds.length
  ) {
    return badRequest(
      "One or more source sections could not be found."
    );
  }

  if (
    targetSections.length !==
    targetSectionIds.length
  ) {
    return badRequest(
      "One or more target sections could not be found."
    );
  }

  const sourceSectionMap = new Map(
    sourceSections.map((section) => [
      section.id,
      section,
    ])
  );

  const targetSectionMap = new Map(
    targetSections.map((section) => [
      section.id,
      section,
    ])
  );

  /**
   * Fetch all classes so we can verify that the target really
   * is the next class.
   */
  const classes = await prisma.schoolClass.findMany({
    orderBy: {
      order: "asc",
    },
  });

  const classIndexById = new Map(
    classes.map((schoolClass, index) => [
      schoolClass.id,
      index,
    ])
  );

  for (const mapping of mappings) {
    const sourceSection =
      sourceSectionMap.get(
        mapping.sourceSectionId
      );

    const targetSection =
      targetSectionMap.get(
        mapping.targetSectionId
      );

    if (!sourceSection || !targetSection) {
      return badRequest(
        "Invalid promotion mapping."
      );
    }

    const sourceIndex = classIndexById.get(
      sourceSection.schoolClassId
    );

    const targetIndex = classIndexById.get(
      targetSection.schoolClassId
    );

    if (
      sourceIndex === undefined ||
      targetIndex === undefined
    ) {
      return badRequest(
        "Invalid class mapping."
      );
    }

    if (
      targetIndex !== sourceIndex + 1
    ) {
      return badRequest(
        `${sourceSection.schoolClass.name} can only be promoted to the next configured class.`
      );
    }
  }

  /**
   * Get source students.
   */
  const sourceEnrollments =
    await prisma.enrollment.findMany({
      where: {
        academicYearId: sourceYearId,
        sectionId: {
          in: sourceSectionIds,
        },
      },
      select: {
        studentId: true,
        sectionId: true,
        rollNumber: true,
      },
    });

  if (sourceEnrollments.length === 0) {
    return badRequest(
      "No students were found in the selected source sections."
    );
  }

  /**
   * Check for existing target-year enrollments first.
   *
   * We do this BEFORE creating anything so this operation
   * cannot accidentally partially promote a batch.
   */
  const studentIds = [
    ...new Set(
      sourceEnrollments.map(
        (enrollment) => enrollment.studentId
      )
    ),
  ];

  const existingTargetEnrollments =
    await prisma.enrollment.findMany({
      where: {
        academicYearId: targetYearId,
        studentId: {
          in: studentIds,
        },
      },
      include: {
        student: true,
        section: {
          include: {
            schoolClass: true,
          },
        },
      },
    });

  if (existingTargetEnrollments.length > 0) {
    return NextResponse.json(
      {
        error:
          "Some students already have an enrollment in the target academic year. Nothing was changed.",
        conflicts:
          existingTargetEnrollments.map(
            (enrollment) => ({
              studentId:
                enrollment.studentId,
              studentName:
                `${enrollment.student.firstName} ${enrollment.student.lastName}`,
              currentTargetClass:
                enrollment.section.schoolClass.name,
              currentTargetSection:
                enrollment.section.name,
            })
          ),
      },
      { status: 409 }
    );
  }

  const mappingMap = new Map(
    mappings.map((mapping) => [
      mapping.sourceSectionId,
      mapping.targetSectionId,
    ])
  );

  /**
   * Build the new enrollment records.
   *
   * The existing roll number is carried forward initially.
   * This is deliberate: it gives the promoted students a
   * usable enrollment immediately rather than creating
   * unusable null roll numbers.
   *
   * We can add a dedicated "reassign roll numbers" tool later.
   */
  const newEnrollments =
    sourceEnrollments.map((enrollment) => {
      const targetSectionId =
        mappingMap.get(
          enrollment.sectionId
        );

      if (!targetSectionId) {
        throw new Error(
          `No destination section was configured for source section ${enrollment.sectionId}.`
        );
      }

      return {
        studentId: enrollment.studentId,
        academicYearId: targetYearId,
        sectionId: targetSectionId,
        rollNumber: enrollment.rollNumber,
      };
    });

  try {
    const created =
      await prisma.$transaction(
        async (tx) => {
          const result =
            await tx.enrollment.createMany({
              data: newEnrollments,
              skipDuplicates: false,
            });

          return result.count;
        }
      );

    return NextResponse.json({
      success: true,
      created,
      sourceStudents:
        sourceEnrollments.length,
      sourceAcademicYear:
        sourceYear.label,
      targetAcademicYear:
        targetYear.label,
    });
  } catch (error) {
    console.error(
      "Student promotion failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Promotion failed. No promotion was completed.",
      },
      { status: 500 }
    );
  }
}