export type StatusKey = "todo" | "prog" | "review" | "done" | "block";
export type Priority = "Tinggi" | "Sedang" | "Rendah";
export interface StandardInfo { id:string; code:string; title:string; description?:string|null; color:string; sortOrder:number; }
export interface StandardStats { total:number; done:number; prog:number; todo:number; block:number; pct:number; overdue:number; }
export interface StandardWithStats extends StandardInfo { stats:StandardStats; }
export interface DocActivity { id:string; actor:string; action:string; fromValue?:string|null; toValue?:string|null; message:string; createdAt:string; }
export interface PmkpDocument {
 id:string; stdCode:string; standardId:string; standard:StandardInfo|null;
 subTopic:string; title:string; description?:string|null;
 elementCode?:string|null; elementAssessment?:string|null; regulationRecommendation?:string|null;
 programWork?:string|null; implementationActivity?:string|null; administrativeDocuments?:string|null;
 supportingFacilities?:string|null; sourcePage?:number|null; checkedItems:string[];
 pic?:string|null; status:StatusKey; progress:number; priority:Priority; dueDate?:string|null;
 pendukung:string[]; admin:string[]; regulasi:string[]; notes?:string|null; createdAt:string; updatedAt:string;
}
export interface PmkpAttachment {
 id:string; documentId:string; filename:string; filePath:string; fileSize:number; mimeType?:string|null;
 evidenceLabel?:string|null; uploadedBy:string; createdAt:string;
 document?:{id:string;title:string;stdCode:string;standard?:{code:string;title:string}|null}|null;
}
export interface DocActivityWithDocument extends DocActivity { docTitle?:string|null; stdCode?:string|null; }
export interface StatsByStatus { done:number; review:number; prog:number; todo:number; block:number; }
export interface StatsActivity { id:string; actor:string; action:string; message:string; createdAt:string; docTitle?:string|null; stdCode?:string|null; }
export interface UpcomingDoc { id:string; title:string; stdCode:string; pic?:string|null; status:StatusKey; progress:number; dueDate?:string|null; color?:string|null; }
export interface DashboardStats { total:number; byStatus:StatsByStatus; avgProgress:number; overdue:number; activities:StatsActivity[]; upcoming:UpcomingDoc[]; }
export const STATUS_META:Record<StatusKey,{label:string;color:string;bg:string;text:string;dot:string}> = {
 done:{label:"Selesai",color:"#059669",bg:"#d1fae5",text:"#065f46",dot:"#10b981"},
 review:{label:"Perlu review",color:"#d97706",bg:"#fef3c7",text:"#92400e",dot:"#f59e0b"},
 prog:{label:"Berjalan",color:"#0284c7",bg:"#e0f2fe",text:"#075985",dot:"#38bdf8"},
 todo:{label:"Belum mulai",color:"#64748b",bg:"#f1f5f9",text:"#334155",dot:"#94a3b8"},
 block:{label:"Terhambat",color:"#e11d48",bg:"#ffe4e6",text:"#9f1239",dot:"#fb7185"},
};
