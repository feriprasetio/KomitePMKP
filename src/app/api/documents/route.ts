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
  elementCode: z.string().max(20).nullable().optional(),
  elementAssessment: z.string().max(5000).nullable().optional(),
  regulationRecommendation: z.string().max(5000).nullable().optional(),
  programWork: z.string().max(2000).nullable().optional(),
  implementationActivity: z.string().max(5000).nullable().optional(),
  administrativeDocuments: z.string().max(10000).nullable().optional(),
  supportingFacilities: z.string().max(2000).nullable().optional(),
  sourcePage: z.number().int().min(1).max(36).nullable().optional(),
  pic: z.string().max(200).nullable().optional(),
  status: z.enum(["todo", "prog", "review", "done", "block"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  priority: z.enum(["Tinggi", "Sedang", "Rendah"]).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  pendukung: z.array(z.string().max(300)).max(200).optional(),
  admin: z.array(z.string().max(300)).max(200).optional(),
  regulasi: z.array(z.string().max(300)).max(200).optional(),
});
function parseArr(s: string | null | undefined): string[] {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []; }
  catch { return []; }
}
function serializeDoc(doc: any) {
  return {
    id: doc.id, stdCode: doc.stdCode, standardId: doc.standardId,
    standard: doc.standard ? { id: doc.standard.id, code: doc.standard.code, title: doc.standard.title, description: doc.standard.description, color: doc.standard.color, sortOrder: doc.standard.sortOrder } : null,
    subTopic: doc.subTopic, title: doc.title, description: doc.description,
    elementCode: doc.elementCode, elementAssessment: doc.elementAssessment,
    regulationRecommendation: doc.regulationRecommendation, programWork: doc.programWork,
    implementationActivity: doc.implementationActivity, administrativeDocuments: doc.administrativeDocuments,
    supportingFacilities: doc.supportingFacilities, sourcePage: doc.sourcePage,
    checkedItems: parseArr(doc.checkedItems), pic: doc.pic, status: doc.status, progress: doc.progress, priority: doc.priority,
    dueDate: doc.dueDate?.toISOString?.() ?? doc.dueDate ?? null,
    pendukung: parseArr(doc.pendukungDocs), admin: parseArr(doc.adminDocs), regulasi: parseArr(doc.regulasiDocs),
    notes: doc.notes, createdAt: doc.createdAt?.toISOString?.() ?? doc.createdAt, updatedAt: doc.updatedAt?.toISOString?.() ?? doc.updatedAt,
  };
}
export async function GET(request: Request) {
  try {
    if (!(await requireSession())) return NextResponse.json({ status: "error", message: "Autentikasi diperlukan." }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const standard = searchParams.get("standard");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const q = searchParams.get("q")?.trim();
    const where: any = {};
    if (standard && standard !== "all") where.standard = { code: standard };
    if (status && status !== "all") where.status = status;
    if (priority && priority !== "all") where.priority = priority;
    if (q) where.OR = [{title:{contains:q,mode:"insensitive"}},{subTopic:{contains:q,mode:"insensitive"}},{stdCode:{contains:q,mode:"insensitive"}},{pic:{contains:q,mode:"insensitive"}}];
    const docs = await db.pmkpDocument.findMany({where,include:{standard:true},orderBy:[{stdCode:"asc"},{title:"asc"}]});
    return NextResponse.json({status:"success",count:docs.length,data:docs.map(serializeDoc)});
  } catch (e) {
    console.error("GET /api/documents failed", e);
    return NextResponse.json({status:"error",message:"Gagal memuat daftar kerja."},{status:500});
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireSession();
    if (!user) return NextResponse.json({status:"error",message:"Autentikasi diperlukan."},{status:401});
    const parsed = documentInput.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({status:"error",message:"Data dokumen tidak valid.",errors:parsed.error.flatten()},{status:400});
    const body = parsed.data;
    const standard = await db.pmkpStandard.findUnique({where:{id:body.standardId}});
    if (!standard) return NextResponse.json({status:"error",message:"Standar PMKP tidak ditemukan."},{status:400});
    const docs = body.admin ?? ["Bukti pelaksanaan","Laporan evaluasi","Rencana tindak lanjut"];
    const doc = await db.$transaction(async (tx) => {
      const created = await tx.pmkpDocument.create({data:{
        stdCode:body.stdCode,standardId:body.standardId,subTopic:body.subTopic,title:body.title,
        description:body.description ?? null,elementCode:body.elementCode ?? null,elementAssessment:body.elementAssessment ?? null,
        regulationRecommendation:body.regulationRecommendation ?? null,programWork:body.programWork ?? null,
        implementationActivity:body.implementationActivity ?? null,administrativeDocuments:body.administrativeDocuments ?? JSON.stringify(docs),
        supportingFacilities:body.supportingFacilities ?? null,sourcePage:body.sourcePage ?? null,
        pic:body.pic ?? null,status:body.status ?? "todo",progress:0,priority:body.priority ?? "Sedang",
        dueDate:body.dueDate ? new Date(body.dueDate) : null,completedAt:null,
        pendukungDocs:JSON.stringify(body.pendukung ?? []),adminDocs:JSON.stringify(docs),regulasiDocs:JSON.stringify(body.regulasi ?? []),
        checkedItems:"[]",
      },include:{standard:true}});
      await tx.pmkpActivity.create({data:{documentId:created.id,actor:user.name,action:"created",message:"Item kerja ditambahkan: "+created.title}});
      return created;
    });
    return NextResponse.json({status:"success",data:serializeDoc(doc)},{status:201});
  } catch (e) {
    console.error("POST /api/documents failed",e);
    return NextResponse.json({status:"error",message:"Tidak dapat menyimpan item kerja."},{status:500});
  }
}
