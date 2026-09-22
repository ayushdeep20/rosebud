import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

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

vi.mock("@/lib/fees", () => ({
  FEE_TYPE_LABELS: {
    TUITION: "Tuition Fee",
    HOSTEL: "Hostel Fee",
    TRANSPORT: "Transport Fee",
    ANNUAL: "Annual Fee",
    ADMISSION: "Admission Fee",
  },
  firstMonthOfYear: () => ({ month: 4, year: 2026 }),
  monthKey: (ym: { month: number; year: number }) => `${ym.year}-${ym.month}`,
  monthLabel: (ym: { month: number; year: number }) => `Month ${ym.month}/${ym.year}`,
  monthsInRange: () => [{ month: 4, year: 2026 }],
}));

vi.mock("@/lib/prisma", () => {
  const prismaMock = {
    academicYear: {
      findUnique: vi.fn(),
    },
    feeStructure: {
      findMany: vi.fn(),
    },
    enrollment: {
      findMany: vi.fn(),
    },
    feeDue: {
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
import { recordAudit } from "@/lib/audit";

describe("Fee Generation API Route (/api/fees/generate)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 403 Forbidden for non-admin requests", async () => {
   vi.mocked(auth as any).mockResolvedValue(null);
    vi.mocked(requireAdmin).mockReturnValue(false);

    const req = new NextRequest("http://localhost:3000/api/fees/generate", {
      method: "POST",
      body: JSON.stringify({ academicYearId: "y1" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("should perform dryRun without executing database writes", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin-1" } } as any);
    vi.mocked(requireAdmin).mockReturnValue(true);

    vi.mocked(prisma.academicYear.findUnique).mockResolvedValue({
      id: "y1",
      label: "2026-2027",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
    } as any);

    vi.mocked(prisma.feeStructure.findMany).mockResolvedValue([
      { schoolClassId: "c1", isBoarder: false, feeType: "TUITION", amount: 1500 },
    ] as any);

    vi.mocked(prisma.enrollment.findMany).mockResolvedValue([
      {
        isNewAdmission: false,
        student: { id: "s1", hostelFacility: false, busFacility: false },
        section: { schoolClass: { id: "c1", name: "Grade 1", order: 1 } },
      },
    ] as any);

    vi.mocked(prisma.feeDue.findMany).mockResolvedValue([]);

    const req = new NextRequest("http://localhost:3000/api/fees/generate", {
      method: "POST",
      body: JSON.stringify({
        academicYearId: "y1",
        months: [{ month: 4, year: 2026 }],
        dryRun: true,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.dryRun).toBe(true);
    expect(body.totals.linesToCreate).toBe(1);
    expect(body.totals.amountToCreate).toBe(1500);

    expect(prisma.feeDue.createMany).not.toHaveBeenCalled();
  });

  it("should process 2,500 students in 1,000-record chunks during live generation", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin-1" } } as any);
    vi.mocked(requireAdmin).mockReturnValue(true);

    vi.mocked(prisma.academicYear.findUnique).mockResolvedValue({
      id: "y1",
      label: "2026-2027",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
    } as any);

    vi.mocked(prisma.feeStructure.findMany).mockResolvedValue([
      { schoolClassId: "c1", isBoarder: false, feeType: "TUITION", amount: 2000 },
    ] as any);

    const mock2500Students = Array.from({ length: 2500 }, (_, i) => ({
      isNewAdmission: false,
      student: { id: `std-${i + 1}`, hostelFacility: false, busFacility: false },
      section: { schoolClass: { id: "c1", name: "Grade 1", order: 1 } },
    }));

    vi.mocked(prisma.enrollment.findMany).mockResolvedValue(mock2500Students as any);
    vi.mocked(prisma.feeDue.findMany).mockResolvedValue([]);
    vi.mocked(prisma.feeDue.createMany)
      .mockResolvedValueOnce({ count: 1000 })
      .mockResolvedValueOnce({ count: 1000 })
      .mockResolvedValueOnce({ count: 500 });

    const req = new NextRequest("http://localhost:3000/api/fees/generate", {
      method: "POST",
      body: JSON.stringify({
        academicYearId: "y1",
        months: [{ month: 4, year: 2026 }],
        dryRun: false,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.created).toBe(2500);

    expect(prisma.feeDue.createMany).toHaveBeenCalledTimes(3);

    expect(recordAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actorUserId: "admin-1",
        action: "FEES_GENERATE",
        entityId: "y1",
      })
    );
  });
});