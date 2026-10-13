import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { z } from "zod";

const patchInput = z.object({
  title: z.string().trim().min(1).max(300).optional(), subTopic: z.string().trim().min(1).max(300).optional(),
  description: z.string().max(5000).nullable().optional(), pic: z.string().max(200).nullable().optional(),
  priority: z.enum(["Tinggi", "Sedang", "Rendah"]).optional(), dueDate: z.string().datetime().nullable().optional(), notes: z.string().max(10000).nullable().optional(),
  status: z.enum(["todo", "prog", "review", "done", "block"]).optional(), progress: z.number().int().min(0).max(100).optional(),
  pendukung: z.array(z.string().max(300)).max(200).optional(), admin: z.array(z.string().max(300)).max(200).optional(), regulasi: z.array(z.string().max(300)).max(200).optional(),
  comment: z.string().max(2000).optional(), newAttachment: z.string().max(255).optional(), actor: z.string().optional(),
});

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
    activities: (doc.activities ?? []).map((a: any) => ({
      id: a.id,
      actor: a.actor,
      action: a.action,
      fromValue: a.fromValue,
      toValue: a.toValue,
      message: a.message,
      createdAt: a.createdAt,
    })),
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await requireSession())) return NextResponse.json({ status: "error", message: "Autentikasi diperlukan." }, { status: 401 });
    const { id } = await params;
    const doc = await db.pmkpDocument.findUnique({
      where: { id },
      include: {
        standard: true,
        activities: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!doc) {
      return NextResponse.json({ status: "error", message: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ status: "success", data: serializeDoc(doc) });
  } catch (e: any) {
    console.error("GET /api/documents/[id] failed:", e);
    return NextResponse.json({ status: "error", message: "Terjadi kesalahan saat memproses dokumen." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    if (!user) return NextResponse.json({ status: "error", message: "Autentikasi diperlukan." }, { status: 401 });
    const { id } = await params;
    const parsed = patchInput.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ status: "error", message: "Data perubahan tidak valid.", errors: parsed.error.flatten() }, { status: 400 });
    const body = parsed.data;
    const existing = await db.pmkpDocument.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ status: "error", message: "Not found" }, { status: 404 });
    }

    const data: any = {};
    const activityEntries: { action: string; message: string; fromValue?: string; toValue?: string }[] = [];

    if (body.title !== undefined) data.title = body.title;
    if (body.subTopic !== undefined) data.subTopic = body.subTopic;
    if (body.description !== undefined) data.description = body.description;
    if (body.pic !== undefined) data.pic = body.pic;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.notes !== undefined) data.notes = body.notes;

    if (body.status !== undefined && body.status !== existing.status) {
      data.status = body.status;
      // automatically bump progress when transitioning
      if (body.status === "done") { data.progress = 100; data.completedAt = existing.status === "done" ? undefined : new Date(); }
      else { data.completedAt = null; }
      if (body.status === "todo" && existing.progress === 0) {
        // keep 0
      } else if (body.status === "prog" && existing.progress === 0) {
        data.progress = 25;
      }
      activityEntries.push({
        action: "status_changed",
        message: `Status diperbarui: ${existing.status} → ${body.status}`,
        fromValue: existing.status,
        toValue: body.status,
      });
    }

    if (body.progress !== undefined && body.progress !== existing.progress) {
      data.progress = body.progress;
      activityEntries.push({
        action: "progress_updated",
        message: `Progress diperbarui: ${existing.progress}% → ${body.progress}%`,
        fromValue: String(existing.progress),
        toValue: String(body.progress),
      });
      // Auto-promote to done if 100%
      if (body.progress === 100 && existing.status !== "done") {
        data.status = "done";
        data.completedAt = new Date();
        activityEntries.push({
          action: "status_changed",
          message: `Status otomatis: Review → Selesai (progress 100%)`,
          fromValue: existing.status,
          toValue: "done",
        });
      }
    }

    if (body.pendukung !== undefined) data.pendukungDocs = JSON.stringify(body.pendukung);
    if (body.admin !== undefined) data.adminDocs = JSON.stringify(body.admin);
    if (body.regulasi !== undefined) data.regulasiDocs = JSON.stringify(body.regulasi);

    if (body.newAttachment) {
      activityEntries.push({
        action: "attachment_uploaded",
        message: `Mengunggah lampiran: ${body.newAttachment}`,
        toValue: body.newAttachment,
      });
    }
    if (body.comment) {
      activityEntries.push({
        action: "comment_added",
        message: `Komentar: ${body.comment}`,
      });
    }

    const fresh = await db.$transaction(async (tx) => {
      await tx.pmkpDocument.update({ where: { id }, data });
      for (const activity of activityEntries) {
        await tx.pmkpActivity.create({
          data: { documentId: id, actor: user.name, ...activity },
        });
      }
      return tx.pmkpDocument.findUnique({
        where: { id },
        include: { standard: true, activities: { orderBy: { createdAt: "desc" }, take: 20 } },
      });
    });

    return NextResponse.json({ status: "success", data: serializeDoc(fresh) });
  } catch (e: any) {
    console.error("PATCH /api/documents/[id] failed:", e);
    return NextResponse.json({ status: "error", message: "Terjadi kesalahan saat memproses dokumen." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    if (!user || user.role !== "superadmin") return NextResponse.json({ status: "error", message: "Hanya superadmin yang dapat menghapus dokumen." }, { status: 403 });
    const { id } = await params;
    await db.pmkpDocument.delete({ where: { id } });
    return NextResponse.json({ status: "success", message: "deleted" });
  } catch (e: any) {
    console.error("DELETE /api/documents/[id] failed:", e);
    return NextResponse.json({ status: "error", message: "Terjadi kesalahan saat memproses dokumen." }, { status: 500 });
  }
}
