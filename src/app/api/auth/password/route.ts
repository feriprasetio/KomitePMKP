import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, hashPassword, requireSession, verifyPassword } from "@/lib/auth";
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 12 || password.length > 1024) return NextResponse.json({ message: "Password baru harus 12–1024 karakter." }, { status: 400 });
    const user = await db.user.findUnique({ where: { id: session.id } });
    if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) return NextResponse.json({ message: "Password saat ini tidak sesuai." }, { status: 400 });
    if (password === currentPassword) return NextResponse.json({ message: "Password baru harus berbeda." }, { status: 400 });
    const updated = await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password), mustChangePassword: false } });
    await createSession(updated);
    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("Password change failed:", error);
    return NextResponse.json({ message: "Tidak dapat memperbarui password." }, { status: 500 });
  }
}
