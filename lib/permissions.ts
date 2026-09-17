// lib/permissions.ts
import type { Session } from "next-auth";

type Role = "ADMIN" | "TEACHER" | "STUDENT";

export function requireAdmin(session: Session | null): boolean {
  return session?.user?.role === "ADMIN";
}

export function requireRole(session: Session | null, roles: Role[]): boolean {
  return !!session?.user?.role && roles.includes(session.user.role as Role);
}

// Placeholders for when Fees/Attendance need scoped checks (Phase 1+):
// export function canManageFees(session: Session | null) { return requireAdmin(session); }
// export function canMarkAttendance(session, sectionId, subjectId) { ... }