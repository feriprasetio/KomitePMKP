import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { deletePrivateObject, readPrivateObject } from "@/lib/storage";

export const runtime = "nodejs";
export async function DELETE(_request:Request,{params}:{params:Promise<{id:string;attachmentId:string}>}){
 try{
  const user=await requireSession();
  if(!user)return NextResponse.json({status:"error",message:"Autentikasi diperlukan."},{status:401});
  if(user.role!=="superadmin")return NextResponse.json({status:"error",message:"Hanya superadmin yang dapat menghapus lampiran."},{status:403});
  const {id,attachmentId}=await params;
  const attachment=await db.pmkpAttachment.findUnique({where:{id:attachmentId}});
  if(!attachment||attachment.documentId!==id)return NextResponse.json({status:"error",message:"Lampiran tidak ditemukan."},{status:404});
  await deletePrivateObject(attachment.filePath);
  await db.$transaction([
   db.pmkpAttachment.delete({where:{id:attachmentId}}),
   db.pmkpActivity.create({data:{documentId:id,actor:user.name,action:"attachment_deleted",message:"Bukti dihapus: "+attachment.filename,fromValue:attachment.evidenceLabel??attachment.filename}})
  ]);
  return NextResponse.json({status:"success"});
 }catch(e){console.error("Delete evidence failed",e);return NextResponse.json({status:"error",message:"Lampiran tidak berhasil dihapus."},{status:500})}
}
export async function GET(request:Request,{params}:{params:Promise<{id:string;attachmentId:string}>}){
 try{
  if(!(await requireSession()))return NextResponse.json({status:"error",message:"Autentikasi diperlukan."},{status:401});
  const {id,attachmentId}=await params;
  const attachment=await db.pmkpAttachment.findUnique({where:{id:attachmentId}});
  if(!attachment||attachment.documentId!==id)return NextResponse.json({status:"error",message:"Lampiran tidak ditemukan."},{status:404});
  const bytes=await readPrivateObject(attachment.filePath);
  const url=new URL(request.url);
  const view=url.searchParams.get("view")==="1";
  const safeName=attachment.filename.replace(/[\\\"\r\n]/g,"_");
  const inlineTypes=new Set(["application/pdf","image/png","image/jpeg","text/plain","text/csv"]);
  const disposition=view&&attachment.mimeType&&inlineTypes.has(attachment.mimeType)?"inline":"attachment";
  return new Response(bytes,{headers:{
   "Content-Type":attachment.mimeType||"application/octet-stream",
   "Content-Length":String(bytes.byteLength),
   "Content-Disposition":disposition+'; filename="'+safeName+'"',
   "X-Content-Type-Options":"nosniff",
   "Cache-Control":"private, no-store"
  }});
 }catch(e){console.error("Read evidence failed",e);return NextResponse.json({status:"error",message:"Berkas tidak dapat dibuka. Pastikan konfigurasi Storage tersedia."},{status:404})}
}
