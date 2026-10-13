import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    if (!(await requireSession())) return NextResponse.json({ status: "error", message: "Autentikasi diperlukan." }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action"); // filter by action type
    const actor = searchParams.get("actor"); // filter by actor
    const documentId = searchParams.get("documentId"); // filter by doc
    const q = searchParams.get("q"); // search in message / docTitle
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);

    const where: any = {};
    if (action && action !== "all") where.action = action;
    if (actor && actor !== "all") where.actor = actor;
    if (documentId && documentId !== "all") where.documentId = documentId;
    if (q && q.trim()) {
      where.message = { contains: q.trim() };
    }

    const [activities, total] = await Promise.all([
      db.pmkpActivity.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
        include: { document: { select: { title: true, stdCode: true } } },
      }),
      db.pmkpActivity.count({ where }),
    ]);

    // Unique actors for filter dropdown
    const actors = await db.pmkpActivity.findMany({
      select: { actor: true },
      distinct: ["actor"],
      orderBy: { actor: "asc" },
    });

    return NextResponse.json({
      status: "success",
      total,
      count: activities.length,
      actors: actors.map((a) => a.actor),
      data: activities.map((a) => ({
        id: a.id,
        actor: a.actor,
        action: a.action,
        fromValue: a.fromValue,
        toValue: a.toValue,
        message: a.message,
        createdAt: a.createdAt,
        documentId: a.documentId,
        docTitle: a.document?.title,
        stdCode: a.document?.stdCode,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ status: "error", message: "Gagal memuat aktivitas." }, { status: 500 });
  }
}
