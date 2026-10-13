import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "@/lib/db";

const scrypt = promisify(scryptCb);
const COOKIE_NAME = "komitepmkp_session";
const SESSION_SECONDS = 60 * 60 * 8;

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET minimal 32 karakter harus dikonfigurasi.");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hex] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hex) return false;
  const expected = Buffer.from(hex, "hex");
  const candidate = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}

export async function ensureBootstrapAdmin() {
  const username = (process.env.ADMIN_USERNAME || "superadmin").trim().toLowerCase();
  const name = (process.env.ADMIN_NAME || "Komite PMKP").trim();
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  const existing = await db.user.findUnique({ where: { username } });
  // Establish the controlled PMKP standard taxonomy, not demo documents or activity rows.
  const standardCount = await db.pmkpStandard.count();
  if (standardCount === 0) {
    const baseStandards = [
      { code: "PMKP 1", title: "Tata Kelola PMKP", description: "Penyusunan regulasi, program kerja, evaluasi dan pelaporan tata kelola PMKP.", color: "#10b981", sortOrder: 1 },
      { code: "PMKP 2", title: "Pengelolaan Indikator Mutu", description: "Kamus indikator, standardisasi pengukuran, koordinasi dan integrasi data mutu.", color: "#34d399", sortOrder: 2 },
      { code: "PMKP 3", title: "Profil Indikator", description: "Pengumpulan data, pemutakhiran profil, kalibrasi metodologi dan supervisi.", color: "#22c55e", sortOrder: 3 },
      { code: "PMKP 4", title: "Analisis Data Mutu", description: "Agregasi data, analisis statistik, interpretasi hasil dan benchmarking.", color: "#84cc16", sortOrder: 4 },
      { code: "PMKP 5", title: "Validasi Data", description: "Penetapan indikator yang divalidasi, analisis ketidaksesuaian dan tindak lanjut.", color: "#eab308", sortOrder: 5 },
      { code: "PMKP 6", title: "Peningkatan Mutu", description: "Proyek perbaikan, monitoring keberlanjutan, standardisasi dan diseminasi.", color: "#f59e0b", sortOrder: 6 },
      { code: "PMKP 7", title: "PPK & Clinical Pathway", description: "Clinical pathway, outcome klinis, serta audit klinis dan medis.", color: "#f97316", sortOrder: 7 },
      { code: "PMKP 8", title: "SP2KP", description: "Pelaporan dan pembelajaran keselamatan pasien, RCA, lesson learned dan ketahanan sistem.", color: "#fb7185", sortOrder: 8 },
      { code: "PMKP 9", title: "IKP (Insiden Keselamatan Pasien)", description: "Validasi data insiden, analisis tren dan integrasi tindak lanjut.", color: "#ec4899", sortOrder: 9 },
      { code: "PMKP 10", title: "Budaya Keselamatan", description: "Survei budaya keselamatan, analisis hasil, pelatihan dan monitoring.", color: "#8b5cf6", sortOrder: 10 },
      { code: "PMKP 11", title: "Manajemen Risiko", description: "Profil risiko, mitigasi, evaluasi pengendalian dan FMEA.", color: "#6366f1", sortOrder: 11 },
    ];
    await db.pmkpStandard.createMany({ data: baseStandards });
  }
  if (existing) return;
  if (!password || password.length < 6) {
    console.warn("Bootstrap admin belum dibuat: set ADMIN_INITIAL_PASSWORD (minimal 6 karakter) di environment deployment.");
    return;
  }
  await db.user.create({ data: { name, username, passwordHash: await hashPassword(password), role: "superadmin", mustChangePassword: true } });
}

export async function createSession(user: { id: string; name: string; username: string; role: string; mustChangePassword: boolean }) {
  const token = await new SignJWT({ name: user.name, username: user.username, role: user.role, mustChangePassword: user.mustChangePassword })
    .setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuedAt().setExpirationTime(`${SESSION_SECONDS}s`).sign(secretKey());
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_SECONDS });
}

export async function getSession() {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub) return null;
    const user = await db.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) return null;
    return { id: user.id, name: user.name, username: user.username, role: user.role, mustChangePassword: user.mustChangePassword };
  } catch { return null; }
}

export async function requireSession() {
  return getSession();
}

export async function clearSession() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}
