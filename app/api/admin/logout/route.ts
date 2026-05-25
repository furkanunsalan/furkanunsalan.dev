import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, type AdminSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const session = await getIronSession<AdminSession>(cookies(), sessionOptions);
  session.destroy();
  return NextResponse.json({ ok: true });
}
