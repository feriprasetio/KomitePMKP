import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
export async function GET() { const user = await requireSession(); if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 }); return NextResponse.json({ status: "success", user }); }
