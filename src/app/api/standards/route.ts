import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET() {
  try {
    if (!(await requireSession())) return NextResponse.json({ status: "error", message: "Autentikasi diperlukan." }, { status: 401 });
    const standards = await db.pmkpStandard.findMany({
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

    const result = standards.map((s) => {
      const docs = s.documents;
      const total = docs.length;
      const done = docs.filter((d) => d.status === "done").length;
      const prog = docs.filter((d) => d.status === "prog" || d.status === "review").length;
      const todo = docs.filter((d) => d.status === "todo").length;
      const block = docs.filter((d) => d.status === "block").length;
      // Standard progress is the mean of document-level progress values.
      const pct = total ? Math.round(docs.reduce((sum, d) => sum + d.progress, 0) / total) : 0;
      const overdue = docs.filter((d) => d.dueDate && new Date(d.dueDate) < new Date() && d.status !== "done").length;
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

    return NextResponse.json({ status: "success", data: result });
  } catch (e: any) {
    console.error("GET /api/standards failed:", e);
    return NextResponse.json({ status: "error", message: "Gagal memuat standar PMKP." }, { status: 500 });
  }
}
