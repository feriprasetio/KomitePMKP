import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "@/lib/db";
const scrypt=promisify(scryptCb);
const COOKIE_NAME="komitepmkp_session";
const SESSION_SECONDS=60*60*8;
function secretKey(){const secret=process.env.AUTH_SECRET;if(!secret||secret.length<32)throw new Error("AUTH_SECRET minimal 32 karakter harus dikonfigurasi.");return new TextEncoder().encode(secret)}
export async function hashPassword(password:string){const salt=randomBytes(16).toString("hex");const derived=(await scrypt(password,salt,64)) as Buffer;return "scrypt$"+salt+"$"+derived.toString("hex")}
export async function verifyPassword(password:string,stored:string){const [scheme,salt,hex]=stored.split("$");if(scheme!=="scrypt"||!salt||!hex)return false;const expected=Buffer.from(hex,"hex");const candidate=(await scrypt(password,salt,expected.length)) as Buffer;return expected.length===candidate.length&&timingSafeEqual(expected,candidate)}
export async function ensureBootstrapAdmin(){
 const username=(process.env.ADMIN_USERNAME||"superadmin").trim().toLowerCase();
 const name=(process.env.ADMIN_NAME||"Komite PMKP").trim();
 const password=process.env.ADMIN_INITIAL_PASSWORD;
 const existing=await db.user.findUnique({where:{username}});
 const standards=[
  {code:"PMKP 1",title:"Tata Kelola PMKP"},{code:"PMKP 2",title:"Pemilihan dan Pengelolaan Indikator Mutu"},
  {code:"PMKP 3",title:"Pengumpulan dan Implementasi Pengukuran Mutu"},{code:"PMKP 4",title:"Agregasi dan Analisis Data Mutu"},
  {code:"PMKP 4.1",title:"Interpretasi Hasil Analisis dan Peluang Perbaikan"},{code:"PMKP 5",title:"Validasi Data Mutu"},
  {code:"PMKP 6",title:"Program Peningkatan Mutu"},{code:"PMKP 7",title:"Panduan Praktik Klinis, Clinical Pathway, dan Audit"},
  {code:"PMKP 8",title:"Sistem Pelaporan dan Pembelajaran Insiden Keselamatan Pasien"},{code:"PMKP 9",title:"Analisis dan Pelaporan Insiden Keselamatan Pasien"},
  {code:"PMKP 10",title:"Budaya Keselamatan Pasien"},{code:"PMKP 11",title:"Manajemen Risiko"}
 ];
 if(await db.pmkpStandard.count()===0){
  await db.pmkpStandard.createMany({data:standards.map((s,i)=>({...s,id:"std_pmkp_"+String(i+1).padStart(2,"0"),description:"Standar Playbook STARKES PMKP",color:["#0f766e","#0e7490","#2563eb","#4f46e5","#7c3aed","#9333ea","#be185d","#c2410c","#b91c1c","#a16207","#047857","#334155"][i],sortOrder:i+1}))});
 }
 if(existing)return;
 if(!password||password.length<12){console.warn("Bootstrap administrator belum dibuat: set ADMIN_INITIAL_PASSWORD minimal 12 karakter sebagai secret server.");return}
 await db.user.create({data:{name,username,passwordHash:await hashPassword(password),role:"superadmin",mustChangePassword:true}});
}
export async function createSession(user:{id:string;name:string;username:string;role:string;mustChangePassword:boolean}){const token=await new SignJWT({name:user.name,username:user.username,role:user.role,mustChangePassword:user.mustChangePassword}).setProtectedHeader({alg:"HS256"}).setSubject(user.id).setIssuedAt().setExpirationTime(SESSION_SECONDS+"s").sign(secretKey());const jar=await cookies();jar.set(COOKIE_NAME,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:SESSION_SECONDS})}
export async function getSession(){try{const jar=await cookies();const token=jar.get(COOKIE_NAME)?.value;if(!token)return null;const {payload}=await jwtVerify(token,secretKey());if(!payload.sub)return null;const user=await db.user.findUnique({where:{id:payload.sub}});if(!user||!user.active)return null;return{id:user.id,name:user.name,username:user.username,role:user.role,mustChangePassword:user.mustChangePassword}}catch{return null}}
export async function requireSession(){return getSession()}
export async function clearSession(){const jar=await cookies();jar.set(COOKIE_NAME,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:0})}
