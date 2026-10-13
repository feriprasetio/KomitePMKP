import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import path from "path";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { deletePrivateObject, uploadPrivateObject } from "@/lib/storage";

export const runtime = "nodejs";
const MAX_SIZE = 20 * 1024 * 1024;
const mimeByExtension: Record<string,string> = {
  ".pdf":"application/pdf",".doc":"application/msword",
  ".docx":"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls":"application/vnd.ms-excel",".xlsx":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt":"application/vnd.ms-powerpoint",".pptx":"application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".csv":"text/csv",".txt":"text/plain",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg"
};
function parseArr(s:string|null|undefined):string[]{if(!s)return[];try{const v=JSON.parse(s);return Array.isArray(v)?v.filter((x):x is string=>typeof x==="string"):[]}catch{return[]}}
function safeName(filename:string){return path.basename(filename).normalize("NFKC").replace(/[^a-zA-Z0-9._-]/g,"_").replace(/^\.+/,"").slice(-100)||"evidence"}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 let uploadedObject: string|undefined;\n let objectSavedToDatabase = false;
 try{
  const user=await requireSession();
  if(!user)return NextResponse.json({status:"error",message:"Autentikasi diperlukan."},{status:401});
  const {id}=await params;
  const doc=await db.pmkpDocument.findUnique({where:{id},select:{id:true,title:true,adminDocs:true}});
  if(!doc)return NextResponse.json({status:"error",message:"Item Playbook tidak ditemukan."},{status:404});
  const form=await request.formData();
  const file=form.get("file");
  const label=String(form.get("evidenceLabel")||"").trim();
  if(!(file instanceof File)||file.size<=0)return NextResponse.json({status:"error",message:"Pilih berkas yang akan diunggah."},{status:400});
  if(file.size>MAX_SIZE)return NextResponse.json({status:"error",message:"Ukuran berkas melebihi batas 20 MB."},{status:413});
  const extension=path.extname(file.name).toLowerCase();
  if(!mimeByExtension[extension])return NextResponse.json({status:"error",message:"Format yang diizinkan: PDF, Word, Excel, PowerPoint, CSV, TXT, PNG, atau JPEG."},{status:400});
  const checklist=parseArr(doc.adminDocs);
  if(!label||(!checklist.includes(label)&&label!=="Lampiran umum"))return NextResponse.json({status:"error",message:"Pilih kategori bukti yang sesuai dengan checklist item."},{status:400});
  const filename=safeName(file.name);
  uploadedObject=id+"/"+randomUUID()+"-"+filename;
  const contentType=mimeByExtension[extension];
  await uploadPrivateObject(uploadedObject,new Uint8Array(await file.arrayBuffer()),contentType);
  const attachment=await db.$transaction(async(tx)=>{
   const row=await tx.pmkpAttachment.create({data:{documentId:id,filename:file.name,filePath:uploadedObject!,fileSize:file.size,mimeType:contentType,evidenceLabel:label,uploadedBy:user.name}});
   await tx.pmkpActivity.create({data:{documentId:id,actor:user.name,action:"attachment_uploaded",message:"Bukti diunggah ("+label+"): "+file.name,toValue:label}});
   return row;
  });
  objectSavedToDatabase = true;
  return NextResponse.json({status:"success",data:{...attachment,createdAt:attachment.createdAt.toISOString()}},{status:201});
 }catch(e){
  console.error("Evidence upload failed",e);
  if(uploadedObject && !objectSavedToDatabase){try{await deletePrivateObject(uploadedObject)}catch(cleanupError){console.error("Storage rollback failed",cleanupError)}}
  return NextResponse.json({status:"error",message:e instanceof Error?e.message:"Unggah bukti gagal."},{status:500});
 }
}
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  if(!(await requireSession()))return NextResponse.json({status:"error",message:"Autentikasi diperlukan."},{status:401});
  const {id}=await params;
  const doc=await db.pmkpDocument.findUnique({where:{id},select:{id:true}});
  if(!doc)return NextResponse.json({status:"error",message:"Item Playbook tidak ditemukan."},{status:404});
  const attachments=await db.pmkpAttachment.findMany({where:{documentId:id},orderBy:{createdAt:"desc"}});
  return NextResponse.json({status:"success",data:attachments.map(a=>({...a,createdAt:a.createdAt.toISOString()}))});
 }catch(e){console.error("List evidence failed",e);return NextResponse.json({status:"error",message:"Gagal memuat daftar bukti."},{status:500})}
}
