"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, LockKeyhole, UserRound } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("superadmin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login gagal");
      router.replace(data.mustChangePassword ? "/account/password" : "/"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Login gagal"); } finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center p-5"><section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl"><div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-300"><ShieldCheck size={28}/></div><p className="text-center text-xs font-semibold uppercase tracking-[.22em] text-emerald-300">Manajemen Mutu Rumah Sakit</p><h1 className="mt-2 text-center text-3xl font-bold">Komite PMKP</h1><p className="mt-2 text-center text-sm text-slate-400">Masuk untuk mengelola dokumen, progres, dan aktivitas PMKP.</p><form onSubmit={submit} className="mt-8 space-y-4"><label className="block text-sm">Username<div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3"><UserRound size={16} className="text-slate-400"/><input autoComplete="username" required value={username} onChange={e=>setUsername(e.target.value)} className="h-12 w-full bg-transparent outline-none"/></div></label><label className="block text-sm">Password<div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3"><LockKeyhole size={16} className="text-slate-400"/><input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className="h-12 w-full bg-transparent outline-none"/></div></label>{error && <p role="alert" className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}<button disabled={busy} className="h-12 w-full rounded-xl bg-emerald-400 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60">{busy ? "Memverifikasi…" : "Masuk"}</button></form><p className="mt-5 text-center text-xs text-slate-500">Akses dicatat dan dibatasi sesuai peran pengguna.</p></section></main>;
}
