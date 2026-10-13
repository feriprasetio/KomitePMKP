import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { requireSession } from "@/lib/auth";

const ATTACHMENTS_DIR = path.join(process.cwd(), "download", "attachments");

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSession();
    if (!user) return NextResponse.json({ status: "error", message: "Autentikasi diperlukan." }, { status: 401 });
    const { id } = await params;

    // Verify doc exists
    const doc = await db.pmkpDocument.findUnique({ where: { id } });
    if (!doc) {
      return NextResponse.json(
        { status: "error", message: "Document not found" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const actor = user.name;

    if (!file || file.size <= 0) {
      return NextResponse.json(
        { status: "error", message: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size (max 20 MB)
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          status: "error",
          message: `File too large. Maximum 20 MB (received ${(file.size / 1024 / 1024).toFixed(2)} MB)`,
        },
        { status: 413 }
      );
    }

    // Allow only document formats expected in PMKP evidence files.
    const ext = path.extname(file.name).toLowerCase();
    const allowed = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".csv", ".txt", ".png", ".jpg", ".jpeg"]);
    if (!allowed.has(ext)) return NextResponse.json({ status: "error", message: `Format file ${ext || "tidak dikenal"} tidak diizinkan.` }, { status: 400 });

    // Ensure dir exists for this doc
    const docDir = path.join(ATTACHMENTS_DIR, id);
    if (!existsSync(docDir)) {
      await mkdir(docDir, { recursive: true });
    }

    // Generate a unique filename to avoid collisions
    const safeBase = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
    const uniqueName = `${randomUUID()}-${safeBase}`;
    const filePath = path.join(docDir, uniqueName);

    // Write file to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filePath, buffer);

    // Persist attachment metadata to DB
    const relativePath = `attachments/${id}/${uniqueName}`;
    let attachment;
    try {
      attachment = await db.pmkpAttachment.create({
      data: {
        documentId: id,
        filename: file.name,
        filePath: relativePath,
        fileSize: file.size,
        mimeType: file.type || null,
        uploadedBy: actor,
      },
    });
    } catch (error) {
      await import("fs/promises").then(({ unlink }) => unlink(filePath)).catch(() => undefined);
      throw error;
    }

    // Log activity
    await db.pmkpActivity.create({
      data: {
        documentId: id,
        actor,
        action: "attachment_uploaded",
        message: `Mengunggah lampiran: ${file.name}`,
        toValue: file.name,
      },
    });

    return NextResponse.json(
      {
        status: "success",
        data: {
          id: attachment.id,
          filename: attachment.filename,
          filePath: attachment.filePath,
          fileSize: attachment.fileSize,
          mimeType: attachment.mimeType,
          uploadedBy: attachment.uploadedBy,
          createdAt: attachment.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (e: any) {
    console.error("POST /api/documents/[id]/attachments failed:", e);
    return NextResponse.json(
      { status: "error", message: "Operasi lampiran gagal." },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await requireSession())) return NextResponse.json({ status: "error", message: "Autentikasi diperlukan." }, { status: 401 });
    const { id } = await params;
    const attachments = await db.pmkpAttachment.findMany({
      where: { documentId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      status: "success",
      data: attachments.map((a) => ({
        id: a.id,
        filename: a.filename,
        filePath: a.filePath,
        fileSize: a.fileSize,
        mimeType: a.mimeType,
        uploadedBy: a.uploadedBy,
        createdAt: a.createdAt,
      })),
    });
  } catch (e: any) {
    return NextResponse.json(
      { status: "error", message: "Operasi lampiran gagal." },
      { status: 500 }
    );
  }
}
