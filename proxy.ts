import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "komitepmkp_session";
function isPublic(path: string) {
  return path.startsWith("/api/auth/") || path === "/login" || path.startsWith("/_next/") || path === "/favicon.ico" || path === "/robots.txt";
}
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (isPublic(path)) return NextResponse.next();
  const secret = process.env.AUTH_SECRET;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  let payload: Record<string, unknown> | null = null;
  if (secret && secret.length >= 32 && token) {
    try { const verified = await jwtVerify(token, new TextEncoder().encode(secret)); payload = verified.payload as Record<string, unknown>; }
    catch { payload = null; }
  }
  if (!payload || typeof payload.sub !== "string") {
    if (path.startsWith("/api/")) return NextResponse.json({ message: "Autentikasi diperlukan." }, { status: 401 });
    const url = request.nextUrl.clone(); url.pathname = "/login"; url.searchParams.set("next", path); return NextResponse.redirect(url);
  }
  if (payload.mustChangePassword === true && path !== "/account/password" && path !== "/api/auth/password") {
    if (path.startsWith("/api/")) return NextResponse.json({ message: "Ganti password awal terlebih dahulu." }, { status: 403 });
    const url = request.nextUrl.clone(); url.pathname = "/account/password"; url.search = ""; return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
