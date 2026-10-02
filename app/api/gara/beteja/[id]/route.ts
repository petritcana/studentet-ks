import { NextResponse } from "next/server";
import { battleView } from "@/lib/competition/battles";
import { getCurrentUser } from "@/lib/session";

/**
 * Gjendja e një beteje, për faqen që e pyet çdo tri sekonda. Kështu lojtari sheh
 * sa ka përparuar kundërshtari dhe rezultatin sapo mbarojnë të dy, pa rifreskuar.
 */
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const view = await battleView({ id: me.id, isVerified: me.isVerified, universityId: me.universityId }, id);
  if (!view) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(view);
}
