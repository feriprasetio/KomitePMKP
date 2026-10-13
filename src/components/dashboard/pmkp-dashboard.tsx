"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, AlertTriangle, CheckCircle2, ClipboardList, Download, FilePlus2, LogOut, RefreshCw, Search, ShieldCheck } from "lucide-react";
import type { DashboardStats, PmkpDocument, Priority, StandardWithStats, StatusKey } from "./types";

type FormState = {
  stdCode: string;
  standardId: string;
  subTopic: string;
  title: string;
  description: string;
  pic: string;
  status: StatusKey;
  progress: number;
  priority: Priority;
  dueDate: string;
};

type Props = {
  standards: StandardWithStats[];
  documents: PmkpDocument[];
  stats: DashboardStats;
  pics: string[];
  displayName?: string;
};

const statusLabels: Record<StatusKey, string> = {
  todo: "Belum dimulai",
  prog: "Dalam proses",
  review: "Menunggu review",
  done: "Selesai",
  block: "Terhambat",
};
const statusClasses: Record<StatusKey, string> = {
  todo: "bg-slate-100 text-slate-700",
  prog: "bg-sky-100 text-sky-800",
  review: "bg-amber-100 text-amber-800",
  done: "bg-emerald-100 text-emerald-800",
  block: "bg-rose-100 text-rose-800",
};

function initialForm(standards: StandardWithStats[], doc?: PmkpDocument | null): FormState {
  const standard = doc ? standards.find((item) => item.id === doc.standardId) : standards[0];
  return {
    stdCode: doc?.stdCode ?? ((standard?.code ?? "PMKP 1") + "a"),
    standardId: doc?.standardId ?? standard?.id ?? "",
    subTopic: doc?.subTopic ?? "",
    title: doc?.title ?? "",
    description: doc?.description ?? "",
    pic: doc?.pic ?? "",
    status: doc?.status ?? "todo",
    progress: doc?.progress ?? 0,
    priority: doc?.priority ?? "Sedang",
    dueDate: doc?.dueDate ? new Date(doc.dueDate).toISOString().slice(0, 10) : "",
  };
}

function dateLabel(value?: string | null) {
  if (!value) return "Belum ditetapkan";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tanggal tidak valid";
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function isOverdue(doc: PmkpDocument) {
  return Boolean(doc.dueDate && new Date(doc.dueDate).getTime() < Date.now() && doc.status !== "done");
}

export function PmkpDashboard({ standards: initialStandards, documents: initialDocuments, stats: initialStats, displayName = "Komite PMKP" }: Props) {
  const router = useRouter();
  const [standards, setStandards] = useState(initialStandards);
  const [documents, setDocuments] = useState(initialDocuments);
  const [stats, setStats] = useState(initialStats);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | StatusKey>("all");
  const [standardFilter, setStandardFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState<PmkpDocument | null>(null);
  const [form, setForm] = useState<FormState>(initialForm(initialStandards));

  const filtered = useMemo(() => documents.filter((doc) => {
    const text = query.trim().toLocaleLowerCase("id-ID");
    const matchesText = !text || [doc.title, doc.subTopic, doc.stdCode, doc.pic ?? ""].some((value) => value.toLocaleLowerCase("id-ID").includes(text));
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    const matchesStandard = standardFilter === "all" || doc.standardId === standardFilter;
    return matchesText && matchesStatus && matchesStandard;
  }).sort((a, b) => {
    const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    return aDue - bDue;
  }), [documents, query, statusFilter, standardFilter]);

  async function refresh() {
    setBusy(true);
    setMessage("");
    try {
      const responses = await Promise.all([
        fetch("/api/standards?ts=" + Date.now(), { cache: "no-store" }),
        fetch("/api/documents?ts=" + Date.now(), { cache: "no-store" }),
        fetch("/api/stats?ts=" + Date.now(), { cache: "no-store" }),
      ]);
      const payloads = await Promise.all(responses.map((response) => response.json()));
      const failed = responses.findIndex((response, index) => !response.ok || payloads[index].status !== "success");
      if (failed >= 0) throw new Error("Sebagian data gagal dimuat. Periksa koneksi database dan sesi login.");
      setStandards(payloads[0].data);
      setDocuments(payloads[1].data);
      setStats(payloads[2].data);
      setMessage("Data berhasil diperbarui.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal memuat data.");
    } finally {
      setBusy(false);
    }
  }

  function openCreate() {
    setActiveDoc(null);
    setForm(initialForm(standards));
    setMessage("");
    setDialogOpen(true);
  }

  function openEdit(doc: PmkpDocument) {
    setActiveDoc(doc);
    setForm(initialForm(standards, doc));
    setMessage("");
    setDialogOpen(true);
  }

  async function saveDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const payload = {
      stdCode: form.stdCode.trim(),
      standardId: form.standardId,
      subTopic: form.subTopic.trim(),
      title: form.title.trim(),
      description: form.description.trim() || null,
      pic: form.pic.trim() || null,
      status: form.status,
      progress: form.status === "done" ? 100 : Number(form.progress),
      priority: form.priority,
      dueDate: form.dueDate ? new Date(form.dueDate + "T00:00:00.000Z").toISOString() : null,
    };
    try {
      const response = await fetch(activeDoc ? "/api/documents/" + activeDoc.id : "/api/documents", {
        method: activeDoc ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || result.status !== "success") throw new Error(result.message || "Dokumen tidak dapat disimpan.");
      setDialogOpen(false);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Dokumen tidak dapat disimpan.");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(doc: PmkpDocument, status: StatusKey) {
    const progress = status === "done" ? 100 : status === "todo" ? 0 : Math.max(25, doc.progress);
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/documents/" + doc.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, progress }),
      });
      const result = await response.json();
      if (!response.ok || result.status !== "success") throw new Error(result.message || "Status tidak dapat diperbarui.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Status tidak dapat diperbarui.");
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const headings = ["Standar", "Kode", "Judul", "Subtopik", "Status", "Progres", "Prioritas", "PIC", "Tenggat"];
    const values = filtered.map((doc) => [doc.standard?.title ?? doc.stdCode, doc.stdCode, doc.title, doc.subTopic, statusLabels[doc.status], String(doc.progress), doc.priority, doc.pic ?? "", doc.dueDate ?? "" ]);
    const escape = (value: string) => "\"" + value.replace(/"/g, "\"\"") + "\"";
    const csv = [headings, ...values].map((line) => line.map(escape).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "komite-pmkp-" + new Date().toISOString().slice(0, 10) + ".csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const doneCount = stats.byStatus.done ?? 0;
  const percentDone = stats.total ? Math.round((doneCount / stats.total) * 100) : 0;

  return (
    <main className="pmkp-bg min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-900/15"><ShieldCheck size={22}/></div>
            <div><div className="font-bold tracking-tight text-slate-900">Komite PMKP</div><div className="text-xs text-slate-500">Peningkatan Mutu & Keselamatan Pasien</div></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-slate-600 sm:inline">Halo, {displayName}</span>
            <button onClick={refresh} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={15} className={busy ? "animate-spin" : ""}/><span className="hidden sm:inline">Muat ulang</span></button>
            <button onClick={logout} className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" title="Keluar" aria-label="Keluar"><LogOut size={16}/></button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6 lg:py-9">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-600 p-6 text-white shadow-xl shadow-emerald-900/10 sm:p-9">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_.6fr] lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide"><Activity size={14}/> DASHBOARD MUTU RUMAH SAKIT</div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Dokumen yang tertata.<br className="hidden sm:block"/> Mutu yang dapat dipantau.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50 sm:text-base">Kelola dokumen, penanggung jawab, tenggat, dan tindak lanjut PMKP secara terukur. Basis data operasional dimulai tanpa dokumen simulasi.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={openCreate} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-emerald-50"><FilePlus2 size={17}/> Tambah dokumen</button>
                <button onClick={exportCsv} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/15"><Download size={17}/> Ekspor CSV</button>
              </div>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
              <div className="text-sm font-medium text-emerald-50">Penyelesaian dokumen</div>
              <div className="mt-2 flex items-end gap-2"><span className="text-5xl font-bold tracking-tight">{percentDone}%</span><span className="mb-1 text-sm text-emerald-100">{doneCount} dari {stats.total}</span></div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-emerald-950/30"><div className="h-full rounded-full bg-white transition-all" style={{width: percentDone + "%"}}/></div>
              <div className="mt-3 text-xs text-emerald-100">Persentase = dokumen selesai / total dokumen.</div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="pmkp-card p-5"><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-500">Total dokumen</span><ClipboardList className="text-emerald-600" size={20}/></div><div className="mt-3 text-3xl font-bold text-slate-900">{stats.total}</div><div className="mt-1 text-xs text-slate-500">Dokumen dalam register PMKP</div></article>
          <article className="pmkp-card p-5"><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-500">Selesai</span><CheckCircle2 className="text-emerald-600" size={20}/></div><div className="mt-3 text-3xl font-bold text-slate-900">{stats.byStatus.done}</div><div className="mt-1 text-xs text-slate-500">Status selesai dan tervalidasi tim</div></article>
          <article className="pmkp-card p-5"><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-500">Rata-rata progres</span><Activity className="text-sky-600" size={20}/></div><div className="mt-3 text-3xl font-bold text-slate-900">{stats.avgProgress}%</div><div className="mt-1 text-xs text-slate-500">Rata-rata progres per dokumen</div></article>
          <article className="pmkp-card p-5"><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-500">Lewat tenggat</span><AlertTriangle className={stats.overdue ? "text-rose-600" : "text-slate-400"} size={20}/></div><div className="mt-3 text-3xl font-bold text-slate-900">{stats.overdue}</div><div className="mt-1 text-xs text-slate-500">Belum selesai dan tanggal tenggat terlewati</div></article>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold tracking-tight text-slate-900">Standar PMKP</h2><p className="mt-1 text-sm text-slate-500">Pilih standar untuk memfilter dokumen pada tabel.</p></div><div className="text-xs text-slate-500">{standards.length} standar terdaftar</div></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {standards.map((standard) => (
              <button key={standard.id} onClick={() => setStandardFilter(standardFilter === standard.id ? "all" : standard.id)} className={"pmkp-card p-4 text-left transition hover:-translate-y-0.5 " + (standardFilter === standard.id ? "ring-2 ring-emerald-500" : "")}>
                <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-wider text-emerald-700">{standard.code}</div><div className="mt-1 font-semibold text-slate-800">{standard.title}</div></div><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-700">{standard.stats.total}</div></div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{width: standard.stats.pct + "%"}}/></div>
                <div className="mt-2 flex justify-between text-xs text-slate-500"><span>{standard.stats.done} selesai</span><span>{standard.stats.pct}% progres</span></div>
              </button>
            ))}
          </div>
        </section>

        <section className="pmkp-card overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
            <div><h2 className="text-xl font-bold tracking-tight text-slate-900">Register dokumen</h2><p className="mt-1 text-sm text-slate-500">Cari, filter, perbarui status, dan buka rincian dokumen.</p></div>
            <button onClick={openCreate} className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"><FilePlus2 size={16}/> Tambah dokumen</button>
          </div>
          <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-[minmax(220px,1fr)_200px_220px] sm:p-5">
            <label className="relative block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari judul, kode, subtopik, PIC…" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"/></label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | StatusKey)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500"><option value="all">Semua status</option>{Object.entries(statusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
            <select value={standardFilter} onChange={(e)=>setStandardFilter(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500"><option value="all">Semua standar</option>{standards.map((standard)=><option key={standard.id} value={standard.id}>{standard.code} — {standard.title}</option>)}</select>
          </div>
          {message && <div role="status" className="border-b border-slate-100 bg-slate-50 px-5 py-3 text-sm text-slate-600">{message}</div>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-semibold">Dokumen</th><th className="px-4 py-3 font-semibold">Standar</th><th className="px-4 py-3 font-semibold">PIC</th><th className="px-4 py-3 font-semibold">Progres</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Tenggat</th><th className="px-4 py-3 font-semibold">Aksi</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((doc) => (
                  <tr key={doc.id} className="hover:bg-emerald-50/30">
                    <td className="max-w-[340px] px-5 py-4"><button onClick={() => openEdit(doc)} className="text-left font-semibold text-slate-800 hover:text-emerald-700">{doc.title}</button><div className="mt-1 text-xs text-slate-500">{doc.stdCode} · {doc.subTopic}</div></td>
                    <td className="px-4 py-4 text-slate-600">{doc.standard?.code ?? doc.stdCode}</td>
                    <td className="px-4 py-4 text-slate-600">{doc.pic || "Belum ditugaskan"}</td>
                    <td className="px-4 py-4"><div className="flex items-center gap-2"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{width: doc.progress + "%"}}/></div><span className="text-xs font-semibold tabular-nums text-slate-600">{doc.progress}%</span></div></td>
                    <td className="px-4 py-4"><select aria-label={"Status " + doc.title} value={doc.status} disabled={busy} onChange={(e)=>changeStatus(doc,e.target.value as StatusKey)} className={"max-w-[165px] rounded-full border-0 px-2.5 py-1.5 text-xs font-semibold outline-none " + statusClasses[doc.status]}>{Object.entries(statusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></td>
                    <td className="px-4 py-4"><span className={isOverdue(doc) ? "font-semibold text-rose-600" : "text-slate-600"}>{dateLabel(doc.dueDate)}</span>{isOverdue(doc)&&<div className="mt-1 text-[11px] text-rose-500">Lewat tenggat</div>}</td>
                    <td className="px-4 py-4"><button onClick={()=>openEdit(doc)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700">Detail / Edit</button></td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={7} className="px-6 py-16 text-center"><div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><ClipboardList size={23}/></div><div className="font-semibold text-slate-800">{documents.length === 0 ? "Register masih kosong" : "Dokumen tidak ditemukan"}</div><p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{documents.length === 0 ? "Data simulasi tidak digunakan. Mulai dengan memasukkan dokumen PMKP yang telah diverifikasi." : "Coba ubah kata kunci atau filter yang digunakan."}</p>{documents.length === 0 && <button onClick={openCreate} className="mt-4 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Tambah dokumen pertama</button>}</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3 text-xs text-slate-500"><span>Menampilkan {filtered.length} dari {documents.length} dokumen</span><span>Terakhir diperbarui sesuai respons database</span></div>
        </section>
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(e)=>{if(e.target===e.currentTarget)setDialogOpen(false);}}>
          <section role="dialog" aria-modal="true" aria-labelledby="document-form-title" className="my-4 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-5"><h2 id="document-form-title" className="text-xl font-bold text-slate-900">{activeDoc ? "Perbarui dokumen" : "Tambah dokumen PMKP"}</h2><p className="mt-1 text-sm text-slate-500">Lengkapi data sesuai dokumen yang sudah diverifikasi.</p></div>
            <form onSubmit={saveDocument} className="space-y-4 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">Standar<select required value={form.standardId} onChange={(e)=>{const selected=standards.find((item)=>item.id===e.target.value);setForm((current)=>({...current,standardId:e.target.value,stdCode:activeDoc?current.stdCode:((selected?.code??"PMKP 1")+"a")}));}} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal outline-none focus:border-emerald-500"><option value="" disabled>Pilih standar</option>{standards.map((standard)=><option key={standard.id} value={standard.id}>{standard.code} — {standard.title}</option>)}</select></label>
                <label className="text-sm font-medium text-slate-700">Kode dokumen<input required value={form.stdCode} onChange={(e)=>setForm({...form,stdCode:e.target.value})} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-500" placeholder="Contoh: PMKP 1a"/></label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">Judul dokumen<input required value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-500" placeholder="Nama dokumen atau bukti pemenuhan"/></label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">Elemen / subtopik<input required value={form.subTopic} onChange={(e)=>setForm({...form,subTopic:e.target.value})} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-500" placeholder="Elemen penilaian atau subtopik"/></label>
                <label className="text-sm font-medium text-slate-700">Penanggung jawab (PIC)<input value={form.pic} onChange={(e)=>setForm({...form,pic:e.target.value})} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-500" placeholder="Nama / unit kerja"/></label>
                <label className="text-sm font-medium text-slate-700">Tenggat<input type="date" value={form.dueDate} onChange={(e)=>setForm({...form,dueDate:e.target.value})} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal outline-none focus:border-emerald-500"/></label>
                <label className="text-sm font-medium text-slate-700">Status<select value={form.status} onChange={(e)=>setForm({...form,status:e.target.value as StatusKey,progress:e.target.value==="done"?100:e.target.value==="todo"?0:form.progress})} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal outline-none focus:border-emerald-500">{Object.entries(statusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
                <label className="text-sm font-medium text-slate-700">Prioritas<select value={form.priority} onChange={(e)=>setForm({...form,priority:e.target.value as Priority})} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal outline-none focus:border-emerald-500"><option>Tinggi</option><option>Sedang</option><option>Rendah</option></select></label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">Deskripsi / catatan konteks<textarea rows={3} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal outline-none focus:border-emerald-500" placeholder="Tujuan, cakupan, atau bukti yang diperlukan"/></label>
                <label className="text-sm font-medium text-slate-700 sm:col-span-2">Progres: {form.status === "done" ? 100 : form.progress}%<input type="range" min={0} max={100} step={5} disabled={form.status==="done"} value={form.status==="done"?100:form.progress} onChange={(e)=>setForm({...form,progress:Number(e.target.value),status:Number(e.target.value)===100?"done":form.status==="done"?"prog":form.status})} className="mt-2 block w-full accent-emerald-600"/></label>
              </div>
              {message && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{message}</p>}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={()=>setDialogOpen(false)} className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Batal</button><button disabled={busy || !form.standardId} type="submit" className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{busy ? "Menyimpan…" : activeDoc ? "Simpan perubahan" : "Simpan dokumen"}</button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
