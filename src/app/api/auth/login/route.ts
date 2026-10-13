import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, ensureBootstrapAdmin, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    await ensureBootstrapAdmin();
    const body = await request.json();
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!username || !password || username.length > 120 || password.length > 1024) return NextResponse.json({ message: "Username dan password wajib diisi." }, { status: 400 });
    const user = await db.user.findUnique({ where: { username } });
    if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) return NextResponse.json({ message: "Username atau password tidak sesuai." }, { status: 401 });
    await createSession(user);
    return NextResponse.json({ status: "success", name: user.name, role: user.role, mustChangePassword: user.mustChangePassword });
  } catch (error) {
    console.error("Authentication failed:", error);
    return NextResponse.json({ message: "Layanan autentikasi belum siap. Periksa konfigurasi server." }, { status: 500 });
  }
}
