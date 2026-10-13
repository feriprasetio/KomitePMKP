import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PmkpDashboard } from "@/components/dashboard/pmkp-dashboard";
import type { DashboardStats, PmkpDocument, StandardWithStats } from "@/components/dashboard/types";
function parseArr(s:string|null|undefined):string[]{if(!s)return[];try{const a=JSON.parse(s);return Array.isArray(a)?a.filter((v):v is string=>typeof v==="string"):[]}catch{return[]}}
function serializeDoc(doc:any):PmkpDocument{
 return {id:doc.id,stdCode:doc.stdCode,standardId:doc.standardId,standard:doc.standard?{id:doc.standard.id,code:doc.standard.code,title:doc.standard.title,description:doc.standard.description,color:doc.standard.color,sortOrder:doc.standard.sortOrder}:null,
 subTopic:doc.subTopic,title:doc.title,description:doc.description,elementCode:doc.elementCode,elementAssessment:doc.elementAssessment,regulationRecommendation:doc.regulationRecommendation,
 programWork:doc.programWork,implementationActivity:doc.implementationActivity,administrativeDocuments:doc.administrativeDocuments,supportingFacilities:doc.supportingFacilities,sourcePage:doc.sourcePage,checkedItems:parseArr(doc.checkedItems),
 pic:doc.pic,status:doc.status,progress:doc.progress,priority:doc.priority,dueDate:doc.dueDate?.toISOString?.()??null,pendukung:parseArr(doc.pendukungDocs),admin:parseArr(doc.adminDocs),regulasi:parseArr(doc.regulasiDocs),notes:doc.notes,
 createdAt:doc.createdAt.toISOString(),updatedAt:doc.updatedAt.toISOString()};
}
export const dynamic="force-dynamic";
export default async function Home(){
 const session=await getSession(); if(!session)redirect("/login");
 const standardsRaw=await db.pmkpStandard.findMany({orderBy:{sortOrder:"asc"},include:{documents:{select:{id:true,status:true,progress:true,priority:true,dueDate:true}}}});
 const standards:StandardWithStats[]=standardsRaw.map(s=>{
  const ds=s.documents;const total=ds.length;const done=ds.filter(d=>d.status==="done").length;const prog=ds.filter(d=>d.status==="prog"||d.status==="review").length;const todo=ds.filter(d=>d.status==="todo").length;const block=ds.filter(d=>d.status==="block").length;
  const pct=total?Math.round(ds.reduce((n,d)=>n+d.progress,0)/total):0;const overdue=ds.filter(d=>d.dueDate&&d.dueDate<new Date()&&d.status!=="done").length;
  return {id:s.id,code:s.code,title:s.title,description:s.description,color:s.color,sortOrder:s.sortOrder,stats:{total,done,prog,todo,block,pct,overdue}};
 });
 const docsRaw=await db.pmkpDocument.findMany({include:{standard:true},orderBy:[{stdCode:"asc"},{title:"asc"}]});
 const documents=docsRaw.map(serializeDoc);
 const total=documents.length;const byStatus={done:0,review:0,prog:0,todo:0,block:0};let totalProgress=0;let overdue=0;const now=new Date();
 for(const d of documents){byStatus[d.status]++;totalProgress+=d.progress;if(d.dueDate&&new Date(d.dueDate)<now&&d.status!=="done")overdue++}
 const [activitiesRaw,attachmentsCount]=await Promise.all([
  db.pmkpActivity.findMany({take:12,orderBy:{createdAt:"desc"},include:{document:{select:{title:true,stdCode:true}}}}),
  db.pmkpAttachment.count()
 ]);
 const stats:DashboardStats={total,byStatus,avgProgress:total?Math.round(totalProgress/total):0,overdue,activities:activitiesRaw.map(a=>({id:a.id,actor:a.actor,action:a.action,message:a.message,createdAt:a.createdAt.toISOString(),docTitle:a.document?.title??null,stdCode:a.document?.stdCode??null})),upcoming:[]};
 const pics=Array.from(new Set(documents.map(d=>d.pic).filter((p):p is string=>Boolean(p)))).sort();
 return <PmkpDashboard standards={standards} documents={documents} stats={stats} pics={pics} displayName={session.name} role={session.role} />;
}
