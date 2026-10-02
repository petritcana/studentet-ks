import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * Sa kushton një pyetje ndaj bazës, e matur aty ku ekzekutohet serveri.
 *
 * Serveri i prodhimit dhe baza mund të rrinë në rajone të ndryshme, dhe atëherë
 * çdo pyetje paguan një udhëtim nëpër rrjet. Pa këtë matje, ngadalësia mbetet
 * hamendje. E hapur vetëm për adminin.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const started = Date.now();
  await db.$queryRaw`SELECT 1`;
  const firstPing = Date.now() - started;

  const pings: number[] = [];
  for (let index = 0; index < 5; index += 1) {
    const at = Date.now();
    await db.$queryRaw`SELECT 1`;
    pings.push(Date.now() - at);
  }

  const parallelStart = Date.now();
  await Promise.all([db.user.count(), db.post.count(), db.announcement.count(), db.ad.count()]);
  const parallelFour = Date.now() - parallelStart;

  return NextResponse.json({
    firstPing,
    pings,
    medianPing: pings.sort((a, b) => a - b)[Math.floor(pings.length / 2)],
    parallelFour,
    region: process.env.AWS_REGION ?? process.env.NETLIFY_REGION ?? "e panjohur",
  });
}
