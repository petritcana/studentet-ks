import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Një pyetje e vogël që e mban bazën zgjuar.
 *
 * Baza falas fle pas disa minutash pa punë, dhe studenti i parë pas gjumit
 * paguan zgjimin. Kjo rrugë thërritet nga një punë e planifikuar çdo pesë
 * minuta. Nuk kthen asnjë të dhënë dhe nuk pranon asgjë.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, ms: Date.now() - started });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
