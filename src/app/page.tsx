import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PmkpDashboard } from "@/components/dashboard/pmkp-dashboard";
import type {
  DashboardStats,
  PmkpDocument,
  StandardWithStats,
} from "@/components/dashboard/types";

// Re-use the same serialization logic as the API routes so the client
// component can treat server-rendered data and refetched data identically.
function parseArr(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function serializeDoc(doc: any): PmkpDocument {
  return {
    id: doc.id,
    stdCode: doc.stdCode,
    standardId: doc.standardId,
    standard: doc.standard
      ? {
          id: doc.standard.id,
          code: doc.standard.code,
          title: doc.standard.title,
          description: doc.standard.description,
          color: doc.standard.color,
          sortOrder: doc.standard.sortOrder,
        }
      : null,
    subTopic: doc.subTopic,
    title: doc.title,
    description: doc.description,
    pic: doc.pic,
    status: doc.status,
    progress: doc.progress,
    priority: doc.priority,
    dueDate: doc.dueDate ? doc.dueDate.toISOString() : null,
    pendukung: parseArr(doc.pendukungDocs),
    admin: parseArr(doc.adminDocs),
    regulasi: parseArr(doc.regulasiDocs),
    notes: doc.notes,
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : new Date().toISOString(),
  };
}

async function getInitialData() {
  // Standards with stats
  const standardsRaw = await db.pmkpStandard.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      documents: {
        select: {
          id: true,
          status: true,
          progress: true,
          priority: true,
          dueDate: true,
        },
      },
    },
  });
  const standards: StandardWithStats[] = standardsRaw.map((s) => {
    const docs = s.documents;
    const total = docs.length;
    const done = docs.filter((d) => d.status === "done").length;
    const prog = docs.filter(
      (d) => d.status === "prog" || d.status === "review",
    ).length;
    const todo = docs.filter((d) => d.status === "todo").length;
    const block = docs.filter((d) => d.status === "block").length;
    const pct = total
      ? Math.round(docs.reduce((sum, d) => sum + d.progress, 0) / total)
      : 0;
    const overdue = docs.filter(
      (d) =>
        d.dueDate &&
        new Date(d.dueDate) < new Date() &&
        d.status !== "done",
    ).length;
    return {
      id: s.id,
      code: s.code,
      title: s.title,
      description: s.description,
      color: s.color,
      sortOrder: s.sortOrder,
      stats: { total, done, prog, todo, block, pct, overdue },
    };
  });

  // All documents (initial filter = "all")
  const docsRaw = await db.pmkpDocument.findMany({
    include: { standard: true },
    orderBy: [{ dueDate: "asc" }, { stdCode: "asc" }],
  });
  const documents: PmkpDocument[] = docsRaw.map(serializeDoc);

  // Unique PICs
  const picSet = new Set<string>();
  for (const d of documents) {
    if (d.pic) picSet.add(d.pic);
  }
  const pics = Array.from(picSet).sort();

  // Stats (mirror /api/stats)
  const all = documents;
  const total = all.length;
  const byStatus = { done: 0, review: 0, prog: 0, todo: 0, block: 0 };
  let totalProgress = 0;
  let overdue = 0;
  const now = new Date();
  for (const d of all) {
    byStatus[d.status as keyof typeof byStatus]++;
    totalProgress += d.progress;
    if (d.dueDate && new Date(d.dueDate) < now && d.status !== "done")
      overdue++;
  }
  const avgProgress = total ? Math.round(totalProgress / total) : 0;

  const activitiesRaw = await db.pmkpActivity.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: { document: { select: { title: true, stdCode: true } } },
  });
  const activities = activitiesRaw.map((a) => ({
    id: a.id,
    actor: a.actor,
    action: a.action,
    message: a.message,
    createdAt: a.createdAt.toISOString(),
    docTitle: a.document?.title ?? null,
    stdCode: a.document?.stdCode ?? null,
  }));

  const upcomingRaw = await db.pmkpDocument.findMany({
    where: { status: { not: "done" }, dueDate: { gte: new Date() } },
    include: { standard: true },
    orderBy: { dueDate: "asc" },
    take: 6,
  });
  const upcoming = upcomingRaw.map((d) => ({
    id: d.id,
    title: d.title,
    stdCode: d.stdCode,
    pic: d.pic,
    status: d.status,
    progress: d.progress,
    dueDate: d.dueDate ? d.dueDate.toISOString() : null,
    color: d.standard?.color ?? null,
  }));

  const stats: DashboardStats = {
    total,
    byStatus,
    avgProgress,
    overdue,
    activities,
    upcoming,
  };

  return { standards, documents, stats, pics };
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  const { standards, documents, stats, pics } = await getInitialData();

  return (
    <PmkpDashboard
      standards={standards}
      documents={documents}
      stats={stats}
      pics={pics}
      displayName={session.name}
    />
  );
}
