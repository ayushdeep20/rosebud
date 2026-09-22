import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { studentId, username, newPassword } = await req.json();

    if (!studentId || !newPassword) {
      return NextResponse.json(
        { error: "Student ID and new password are required" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Fetch student record
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student record not found" }, { status: 404 });
    }

    // CASE 1: Student already has a linked User account -> Update Password
    if (student.userId || student.user) {
      const targetUserId = student.userId || student.user?.id;
      if (targetUserId) {
        await prisma.user.update({
          where: { id: targetUserId },
          data: { passwordHash: hashedPassword },
        });

        return NextResponse.json({
          message: "Password updated successfully",
        });
      }
    }

    // CASE 2: No User account exists -> Auto-create User account & Link to Student
    const s = student as any;
    const admNo = s.admissionNo ?? s.admissionNumber ?? `student_${student.id}`;
    const targetUsername =
      username && username !== "No Login Created"
        ? username
        : admNo;

    // Check if user already exists by username
    const existingUser = await prisma.user.findUnique({
      where: { username: targetUsername },
    });

    let userIdToLink = "";

    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { passwordHash: hashedPassword },
      });
      userIdToLink = existingUser.id;
    } else {
      const newUser = await prisma.user.create({
        data: {
          username: targetUsername,
          passwordHash: hashedPassword,
          role: "STUDENT",
        },
      });
      userIdToLink = newUser.id;
    }

    // Link user account to student
    await prisma.student.update({
      where: { id: student.id },
      data: { userId: userIdToLink },
    });

    return NextResponse.json({
      message: "User account created and password set successfully",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reset password" },
      { status: 500 }
    );
  }
}