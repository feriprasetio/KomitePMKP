import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { z } from "zod";

const patchInput = z.object({
  title:z.string().trim().min(1).max(300).optional(), subTopic:z.string().trim().min(1).max(300).optional(),
  description:z.string().max(5000).nullable().optional(), pic:z.string().max(200).nullable().optional(),
  priority:z.enum(["Tinggi","Sedang","Rendah"]).optional(), dueDate:z.string().datetime().nullable().optional(),
  notes:z.string().max(10000).nullable().optional(), status:z.enum(["todo","prog","review","done","block"]).optional(),
  progress:z.number().int().min(0).max(100).optional(),
  checkedItems:z.array(z.string().max(300)).max(200).optional(),
  pendukung:z.array(z.string().max(300)).max(200).optional(), admin:z.array(z.string().max(300)).max(200).optional(),
  regulasi:z.array(z.string().max(300)).max(200).optional(), comment:z.string().max(2000).optional(),
});
function parseArr(s:string|null|undefined):string[]{if(!s)return[];try{const v=JSON.parse(s);return Array.isArray(v)?v.filter((x):x is string=>typeof x==="string"):[]}catch{return[]}}
function serializeDoc(doc:any){
 return {id:doc.id,stdCode:doc.stdCode,standardId:doc.standardId,standard:doc.standard?{id:doc.standard.id,code:doc.standard.code,title:doc.standard.title,description:doc.standard.description,color:doc.standard.color,sortOrder:doc.standard.sortOrder}:null,
 subTopic:doc.subTopic,title:doc.title,description:doc.description,elementCode:doc.elementCode,elementAssessment:doc.elementAssessment,
 regulationRecommendation:doc.regulationRecommendation,programWork:doc.programWork,implementationActivity:doc.implementationActivity,administrativeDocuments:doc.administrativeDocuments,supportingFacilities:doc.supportingFacilities,sourcePage:doc.sourcePage,checkedItems:parseArr(doc.checkedItems),
 pic:doc.pic,status:doc.status,progress:doc.progress,priority:doc.priority,dueDate:doc.dueDate?.toISOString?.()??doc.dueDate??null,
 pendukung:parseArr(doc.pendukungDocs),admin:parseArr(doc.adminDocs),regulasi:parseArr(doc.regulasiDocs),notes:doc.notes,
 createdAt:doc.createdAt?.toISOString?.()??doc.createdAt,updatedAt:doc.updatedAt?.toISOString?.()??doc.updatedAt,
 activities:(doc.activities??[]).map((a:any)=>({id:a.id,actor:a.actor,action:a.action,fromValue:a.fromValue,toValue:a.toValue,message:a.message,createdAt:a.createdAt?.toISOString?.()??a.createdAt}))};
}
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  if(!(await requireSession()))return NextResponse.json({status:"error",message:"Autentikasi diperlukan."},{status:401});
  const {id}=await params;
  const doc=await db.pmkpDocument.findUnique({where:{id},include:{standard:true,activities:{orderBy:{createdAt:"desc"},take:30}});
  if(!doc)return NextResponse.json({status:"error",message:"Item kerja tidak ditemukan."},{status:404});
  return NextResponse.json({status:"success",data:serializeDoc(doc)});
 }catch(e){console.error("GET document failed",e);return NextResponse.json({status:"error",message:"Gagal membaca item kerja."},{status:500})}
}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const user=await requireSession();
  if(!user)return NextResponse.json({status:"error",message:"Autentikasi diperlukan."},{status:401});
  const {id}=await params;
  const parsed=patchInput.safeParse(await request.json());
  if(!parsed.success)return NextResponse.json({status:"error",message:"Perubahan tidak valid.",errors:parsed.error.flatten()},{status:400});
  const body=parsed.data;
  const existing=await db.pmkpDocument.findUnique({where:{id}});
  if(!existing)return NextResponse.json({status:"error",message:"Item kerja tidak ditemukan."},{status:404});
  const checklist=parseArr(existing.adminDocs);
  let checked=body.checkedItems ?? parseArr(existing.checkedItems);
  checked=Array.from(new Set(checked)).filter(label=>checklist.includes(label));
  if(body.status==="done" && (checklist.length===0 || checked.length!==checklist.length)){
   return NextResponse.json({status:"error",message:"Item belum dapat diselesaikan. Verifikasi seluruh checklist bukti terlebih dahulu."},{status:409});
  }
  const data:any={};
  for(const field of ["title","subTopic","description","pic","priority","notes"] as const)if(body[field]!==undefined)data[field]=body[field];
  if(body.dueDate!==undefined)data.dueDate=body.dueDate?new Date(body.dueDate):null;
  if(body.pendukung!==undefined)data.pendukungDocs=JSON.stringify(body.pendukung);
  if(body.admin!==undefined)data.adminDocs=JSON.stringify(body.admin);
  if(body.regulasi!==undefined)data.regulasiDocs=JSON.stringify(body.regulasi);
  const activity:{action:string;message:string;fromValue?:string;toValue?:string}[]=[];
  if(body.checkedItems!==undefined){
    data.checkedItems=JSON.stringify(checked);
    data.progress=checklist.length?Math.round(checked.length/checklist.length*100):0;
    activity.push({action:"checklist_updated",message:"Checklist bukti diverifikasi: "+checked.length+"/"+checklist.length,fromValue:String(parseArr(existing.checkedItems).length),toValue:String(checked.length)});
  }
  if(body.status!==undefined){
    if(body.status==="done"){
      data.status="done";data.progress=100;data.completedAt=existing.status==="done"?(existing as any).completedAt:new Date();
    }else{
      data.status=body.status;data.completedAt=null;
      if(body.status==="prog" && !body.checkedItems && existing.progress===0)data.progress=0;
    }
    if(body.status!==existing.status)activity.push({action:"status_changed",message:"Status berubah: "+existing.status+" → "+body.status,fromValue:existing.status,toValue:body.status});
  }else if(body.checkedItems!==undefined && data.progress<100 && existing.status==="done"){
    data.status="prog";data.completedAt=null;
  }else if(body.checkedItems!==undefined && data.progress===100 && existing.status==="todo"){
    data.status="review";
  }
  if(body.comment?.trim())activity.push({action:"comment_added",message:"Catatan: "+body.comment.trim()});
  const fresh=await db.$transaction(async(tx)=>{
    await tx.pmkpDocument.update({where:{id},data});
    for(const entry of activity)await tx.pmkpActivity.create({data:{documentId:id,actor:user.name,...entry}});
    return tx.pmkpDocument.findUnique({where:{id},include:{standard:true,activities:{orderBy:{createdAt:"desc"},take:30}});
  });
  return NextResponse.json({status:"success",data:serializeDoc(fresh)});
 }catch(e){console.error("PATCH document failed",e);return NextResponse.json({status:"error",message:"Tidak dapat menyimpan perubahan."},{status:500})}
}
export async function DELETE(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const user=await requireSession();
  if(!user||user.role!=="superadmin")return NextResponse.json({status:"error",message:"Hanya superadmin yang dapat menghapus item kerja."},{status:403});
  const {id}=await params;
  await db.pmkpDocument.delete({where:{id}});
  return NextResponse.json({status:"success"});
 }catch(e){console.error("DELETE document failed",e);return NextResponse.json({status:"error",message:"Item kerja tidak dapat dihapus."},{status:500})}
}
