import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
export async function GET(){
 try{
  if(!(await requireSession()))return NextResponse.json({status:"error",message:"Autentikasi diperlukan."},{status:401});
  const attachments=await db.pmkpAttachment.findMany({take:500,orderBy:{createdAt:"desc"},include:{document:{select:{id:true,title:true,stdCode:true,standard:{select:{code:true,title:true}}}}}});
  return NextResponse.json({status:"success",count:attachments.length,data:attachments.map(a=>({
   id:a.id,documentId:a.documentId,filename:a.filename,fileSize:a.fileSize,mimeType:a.mimeType,
   evidenceLabel:a.evidenceLabel,uploadedBy:a.uploadedBy,createdAt:a.createdAt.toISOString(),
   document:a.document?{id:a.document.id,title:a.document.title,stdCode:a.document.stdCode,standard:a.document.standard}:null
  }))});
 }catch(e){console.error("GET all evidence failed",e);return NextResponse.json({status:"error",message:"Gagal memuat repository bukti."},{status:500})}
}
