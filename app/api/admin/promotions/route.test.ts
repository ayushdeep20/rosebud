import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";

// --- Mocks ---
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  recordAudit: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/prisma", () => {
  const prismaMock = {
    academicYear: {
      findUnique: vi.fn(),
    },
    schoolClass: {
      findMany: vi.fn(),
    },
    section: {
      findMany: vi.fn(),
    },
    enrollment: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn((callback: (tx: typeof prismaMock) => Promise<unknown>) =>
      callback(prismaMock)
    ),
  };
  return { prisma: prismaMock };
});

import { auth } from "@/auth";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

describe("Promotions API Route (/api/admin/promotions)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/promotions", () => {
    it("should return 403 Forbidden if user is not authenticated or not an admin", async () => {
      vi.mocked(auth as any).mockResolvedValue(null);
      vi.mocked(requireAdmin).mockReturnValue(false);

      const request = new Request(
        "http://localhost:3000/api/admin/promotions?sourceYearId=year1&targetYearId=year2"
      );
      const res = await GET(request);

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("Forbidden");
    });

    it("should return 400 Bad Request if sourceYearId or targetYearId is missing", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "admin-1" } } as any);
      vi.mocked(requireAdmin).mockReturnValue(true);

      const request = new Request("http://localhost:3000/api/admin/promotions?sourceYearId=year1");
      const res = await GET(request);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("sourceYearId and targetYearId are required.");
    });

    it("should map promotion groups for all sections correctly", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "admin-1" } } as any);
      vi.mocked(requireAdmin).mockReturnValue(true);

      vi.mocked(prisma.academicYear.findUnique)
        .mockResolvedValueOnce({ id: "y1", label: "2025-2026", startDate: new Date("2025-01-01") } as any)
        .mockResolvedValueOnce({ id: "y2", label: "2026-2027", startDate: new Date("2026-01-01") } as any);

      vi.mocked(prisma.schoolClass.findMany).mockResolvedValue([
        { id: "c1", name: "Grade 1", order: 1 },
        { id: "c2", name: "Grade 2", order: 2 },
      ] as any);

      vi.mocked(prisma.enrollment.findMany).mockResolvedValue([
        {
          section: {
            id: "s1",
            name: "A",
            schoolClass: { id: "c1", name: "Grade 1", order: 1 },
          },
        },
      ] as any);

      vi.mocked(prisma.section.findMany).mockResolvedValue([
        { id: "s2", name: "A", schoolClassId: "c2" },
      ] as any);

      const request = new Request(
        "http://localhost:3000/api/admin/promotions?sourceYearId=y1&targetYearId=y2"
      );
      const res = await GET(request);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.totalStudents).toBe(1);
      expect(body.groups[0].promotable).toBe(true);
      expect(body.groups[0].targetSectionId).toBe("s2");
    });
  });

  describe("POST /api/admin/promotions (Bulk Promotion - 2,500 Students)", () => {
    it("should promote 2,500 students seamlessly in a transaction", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "admin-1" } } as any);
      vi.mocked(requireAdmin).mockReturnValue(true);

      vi.mocked(prisma.academicYear.findUnique)
        .mockResolvedValueOnce({ id: "y1", label: "2025-2026", startDate: new Date("2025-01-01") } as any)
        .mockResolvedValueOnce({ id: "y2", label: "2026-2027", startDate: new Date("2026-01-01") } as any);

      vi.mocked(prisma.section.findMany)
        .mockResolvedValueOnce([{ id: "sec-src-1", schoolClassId: "c1", schoolClass: { name: "Grade 1" } }] as any)
        .mockResolvedValueOnce([{ id: "sec-tgt-1", schoolClassId: "c2", schoolClass: { name: "Grade 2" } }] as any);

      vi.mocked(prisma.schoolClass.findMany).mockResolvedValue([
        { id: "c1", name: "Grade 1", order: 1 },
        { id: "c2", name: "Grade 2", order: 2 },
      ] as any);

      const mock2500Students = Array.from({ length: 2500 }, (_, i) => ({
        studentId: `student-${i + 1}`,
        sectionId: "sec-src-1",
        rollNumber: i + 1,
      }));

      vi.mocked(prisma.enrollment.findMany)
        .mockResolvedValueOnce(mock2500Students as any)
        .mockResolvedValueOnce([]);

      vi.mocked(prisma.enrollment.createMany).mockResolvedValue({ count: 2500 });

      const request = new Request("http://localhost:3000/api/admin/promotions", {
        method: "POST",
        body: JSON.stringify({
          sourceYearId: "y1",
          targetYearId: "y2",
          mappings: [{ sourceSectionId: "sec-src-1", targetSectionId: "sec-tgt-1" }],
        }),
      });

      const res = await POST(request);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.created).toBe(2500);
      expect(body.sourceStudents).toBe(2500);
    });

    it("should return HTTP 409 when target enrollment conflicts exist", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "admin-1" } } as any);
      vi.mocked(requireAdmin).mockReturnValue(true);

      vi.mocked(prisma.academicYear.findUnique)
        .mockResolvedValueOnce({ id: "y1", label: "2025-2026", startDate: new Date("2025-01-01") } as any)
        .mockResolvedValueOnce({ id: "y2", label: "2026-2027", startDate: new Date("2026-01-01") } as any);

      vi.mocked(prisma.section.findMany)
        .mockResolvedValueOnce([{ id: "sec-src-1", schoolClassId: "c1", schoolClass: { name: "Grade 1" } }] as any)
        .mockResolvedValueOnce([{ id: "sec-tgt-1", schoolClassId: "c2", schoolClass: { name: "Grade 2" } }] as any);

      vi.mocked(prisma.schoolClass.findMany).mockResolvedValue([
        { id: "c1", name: "Grade 1", order: 1 },
        { id: "c2", name: "Grade 2", order: 2 },
      ] as any);

      vi.mocked(prisma.enrollment.findMany)
        .mockResolvedValueOnce([
          { studentId: "std-conflict-1", sectionId: "sec-src-1", rollNumber: 10 },
        ] as any)
        .mockResolvedValueOnce([
          {
            studentId: "std-conflict-1",
            student: { firstName: "John", lastName: "Doe" },
            section: { name: "A", schoolClass: { name: "Grade 2" } },
          },
        ] as any);

      const request = new Request("http://localhost:3000/api/admin/promotions", {
        method: "POST",
        body: JSON.stringify({
          sourceYearId: "y1",
          targetYearId: "y2",
          mappings: [{ sourceSectionId: "sec-src-1", targetSectionId: "sec-tgt-1" }],
        }),
      });

      const res = await POST(request);
      expect(res.status).toBe(409);

      const body = await res.json();
      expect(body.conflicts).toHaveLength(1);
      expect(body.conflicts[0].studentName).toBe("John Doe");
    });
  });
});