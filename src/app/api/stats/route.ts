import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET() {
  try {
    if (!(await requireSession())) return NextResponse.json({ status: "error", message: "Autentikasi diperlukan." }, { status: 401 });
    const all = await db.pmkpDocument.findMany({
      select: { status: true, progress: true, priority: true, dueDate: true },
    });
    const total = all.length;
    const c = { done: 0, review: 0, prog: 0, todo: 0, block: 0 };
    let totalProgress = 0;
    let overdue = 0;
    const now = new Date();
    for (const d of all) {
      c[d.status as keyof typeof c]++;
      totalProgress += d.progress;
      if (d.dueDate && new Date(d.dueDate) < now && d.status !== "done") overdue++;
    }
    const avgProgress = total ? Math.round(totalProgress / total) : 0;

    // Activities for timeline
    const activities = await db.pmkpActivity.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { document: { select: { title: true, stdCode: true } } },
    });

    // Upcoming (not done, sorted by dueDate asc, take 6)
    const upcoming = await db.pmkpDocument.findMany({
      where: { status: { not: "done" }, dueDate: { gte: new Date() } },
      include: { standard: true },
      orderBy: { dueDate: "asc" },
      take: 6,
    });

    return NextResponse.json({
      status: "success",
      data: {
        total,
        byStatus: c,
        avgProgress,
        overdue,
        activities: activities.map((a) => ({
          id: a.id,
          actor: a.actor,
          action: a.action,
          message: a.message,
          createdAt: a.createdAt,
          docTitle: a.document?.title,
          stdCode: a.document?.stdCode,
        })),
        upcoming: upcoming.map((d) => ({
          id: d.id,
          title: d.title,
          stdCode: d.stdCode,
          pic: d.pic,
          status: d.status,
          progress: d.progress,
          dueDate: d.dueDate,
          color: d.standard?.color,
        })),
      },
    });
  } catch (e: any) {
    console.error("GET /api/stats failed:", e);
    return NextResponse.json({ status: "error", message: "Gagal memuat statistik." }, { status: 500 });
  }
}
