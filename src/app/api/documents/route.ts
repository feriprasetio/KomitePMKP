import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { z } from "zod";

const documentInput = z.object({
  stdCode: z.string().trim().min(1).max(80),
  standardId: z.string().min(1).max(100),
  subTopic: z.string().trim().min(1).max(300),
  title: z.string().trim().min(1).max(300),
  description: z.string().max(5000).nullable().optional(),
  pic: z.string().max(200).nullable().optional(),
  status: z.enum(["todo", "prog", "review", "done", "block"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  priority: z.enum(["Tinggi", "Sedang", "Rendah"]).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  pendukung: z.array(z.string().max(300)).max(200).optional(),
  admin: z.array(z.string().max(300)).max(200).optional(),
  regulasi: z.array(z.string().max(300)).max(200).optional(),
});

// Helper to parse JSON arrays safely
function parseArr(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function serializeDoc(doc: any) {
  return {
    id: doc.id,
    stdCode: doc.stdCode,
    standardId: doc.standardId,
    standard: doc.standard
      ? {
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
    dueDate: doc.dueDate,
    pendukung: parseArr(doc.pendukungDocs),
    admin: parseArr(doc.adminDocs),
    regulasi: parseArr(doc.regulasiDocs),
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function GET(request: Request) {
  try {
    if (!(await requireSession())) return NextResponse.json({ status: "error", message: "Autentikasi diperlukan." }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const stdParam = searchParams.get("standard"); // "1" | "all"
    const stParam = searchParams.get("status"); // todo|prog|review|done|block|all
    const priority = searchParams.get("priority");
    const search = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "0") || 0;

    const where: any = {};
    if (stdParam && stdParam !== "all") {
      // Look up standard by sortOrder
      const std = await db.pmkpStandard.findFirst({
        where: { sortOrder: parseInt(stdParam) },
      });
      if (std) where.standardId = std.id;
    }
    if (stParam && stParam !== "all") where.status = stParam;
    if (priority && priority !== "all") where.priority = priority;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { subTopic: { contains: search } },
        { stdCode: { contains: search } },
        { pic: { contains: search } },
      ];
    }

    let docs = await db.pmkpDocument.findMany({
      where,
      include: { standard: true },
      orderBy: [{ dueDate: "asc" }, { stdCode: "asc" }],
      ...(limit > 0 ? { take: limit } : {}),
    });

    return NextResponse.json({
      status: "success",
      count: docs.length,
      data: docs.map(serializeDoc),
    });
  } catch (e: any) {
    console.error("GET /api/documents failed:", e);
    return NextResponse.json({ status: "error", message: "Gagal memuat dokumen." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSession();
    if (!user) return NextResponse.json({ status: "error", message: "Autentikasi diperlukan." }, { status: 401 });
    const parsed = documentInput.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ status: "error", message: "Data dokumen tidak valid.", errors: parsed.error.flatten() }, { status: 400 });
    const { stdCode, standardId, subTopic, title, description, pic, status, progress, priority, dueDate, pendukung, admin, regulasi } = parsed.data;
    if (!title || !subTopic || !stdCode || !standardId) {
      return NextResponse.json(
        { status: "error", message: "title, subTopic, stdCode, standardId required" },
        { status: 400 }
      );
    }
    const standard = await db.pmkpStandard.findUnique({ where: { id: standardId } });
    if (!standard) return NextResponse.json({ status: "error", message: "Standar PMKP tidak ditemukan." }, { status: 400 });
    const doc = await db.$transaction(async (tx) => {
      const created = await tx.pmkpDocument.create({
        data: {
          stdCode, standardId, subTopic, title,
          description: description ?? null,
          pic: pic ?? null,
          status: status ?? "todo",
          progress: status === "done" ? 100 : (typeof progress === "number" ? progress : 0),
          priority: priority ?? "Sedang",
          dueDate: dueDate ? new Date(dueDate) : null,
          completedAt: status === "done" ? new Date() : null,
          pendukungDocs: pendukung ? JSON.stringify(pendukung) : null,
          adminDocs: admin ? JSON.stringify(admin) : null,
          regulasiDocs: regulasi ? JSON.stringify(regulasi) : null,
        }, include: { standard: true },
      });
      await tx.pmkpActivity.create({ data: { documentId: created.id, actor: user.name, action: "created", message: `Dokumen baru dibuat: ${created.title}` } });
      return created;
    });
    return NextResponse.json({ status: "success", data: serializeDoc(doc) }, { status: 201 });
  } catch (e: any) {
    console.error("POST /api/documents failed:", e);
    return NextResponse.json({ status: "error", message: "Terjadi kesalahan saat memproses dokumen." }, { status: 500 });
  }
}
