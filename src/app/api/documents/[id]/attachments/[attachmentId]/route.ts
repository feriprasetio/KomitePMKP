import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { unlink } from "fs/promises";
import path from "path";
import { requireSession } from "@/lib/auth";

const ATTACHMENTS_DIR = path.join(process.cwd(), "download", "attachments");

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const user = await requireSession();
    if (!user) return NextResponse.json({ status: "error", message: "Autentikasi diperlukan." }, { status: 401 });
    if (request.method === "DELETE" && user.role !== "superadmin") return NextResponse.json({ message: "Hanya superadmin yang dapat menghapus lampiran." }, { status: 403 });
    const { id, attachmentId } = await params;
    const attachment = await db.pmkpAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!attachment || attachment.documentId !== id) {
      return NextResponse.json(
        { status: "error", message: "Attachment not found" },
        { status: 404 }
      );
    }

    // Remove file from disk (best-effort)
    try {
      const fullPath = path.resolve(ATTACHMENTS_DIR, attachment.filePath.replace(/^attachments[\\/]/, ""));
      if (!fullPath.startsWith(ATTACHMENTS_DIR + path.sep)) throw new Error("Invalid attachment path");
      await unlink(fullPath);
    } catch {
      // file may already be gone; ignore
    }

    await db.pmkpAttachment.delete({ where: { id: attachmentId } });

    // Log activity
    await db.pmkpActivity.create({
      data: {
        documentId: id,
        actor: user.name,
        action: "attachment_deleted",
        message: `Menghapus lampiran: ${attachment.filename}`,
        fromValue: attachment.filename,
      },
    });

    return NextResponse.json({ status: "success", message: "deleted" });
  } catch (e: any) {
    console.error("DELETE attachment failed:", e);
    return NextResponse.json(
      { status: "error", message: "Operasi lampiran gagal." },
      { status: 500 }
    );
  }
}


export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    if (!(await requireSession())) return NextResponse.json({ status: "error", message: "Autentikasi diperlukan." }, { status: 401 });
    const { id, attachmentId } = await params;
    const attachment = await db.pmkpAttachment.findUnique({ where: { id: attachmentId } });
    if (!attachment || attachment.documentId !== id) return NextResponse.json({ status: "error", message: "Attachment not found" }, { status: 404 });
    const fullPath = path.resolve(ATTACHMENTS_DIR, attachment.filePath.replace(/^attachments[\\/]/, ""));
    if (!fullPath.startsWith(ATTACHMENTS_DIR + path.sep)) return NextResponse.json({ message: "Invalid attachment path" }, { status: 400 });
    const { readFile } = await import("fs/promises");
    const data = await readFile(fullPath);
    const safeName = attachment.filename.replace(/[\\"\r\n]/g, "_");
    return new Response(data, { headers: { "Content-Type": attachment.mimeType || "application/octet-stream", "Content-Length": String(data.byteLength), "Content-Disposition": `attachment; filename="${safeName}"`, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Download attachment failed:", error);
    return NextResponse.json({ message: "Lampiran tidak dapat diunduh." }, { status: 404 });
  }
}
