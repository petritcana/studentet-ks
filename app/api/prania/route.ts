import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return new Response(null, { status: 204 });

  await db.user.update({
    where: { id: userId },
    data: { lastSeenAt: new Date() },
  });

  return new Response(null, { status: 204 });
}
