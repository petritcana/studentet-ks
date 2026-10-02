import { auth } from "@/lib/auth";
import { db, parseList } from "@/lib/db";

/**
 * Detajet e një shpalljeje, për sirtarin.
 *
 * Kthen vetëm atë që ekziston vërtet në bazë. Kur kompania nuk i ka shkruar
 * kërkesat ose pagesën, kthehet `null` dhe sirtari nuk e shfaq atë seksion: një
 * fushë e shpikur do ta bënte shpalljen të dukej më e plotë nga sa është.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return new Response(null, { status: 401 });

  const { id } = await params;

  const job = await db.jobPost.findUnique({
    where: { id },
    select: { description: true, requirements: true, skills: true, salary: true },
  });
  if (!job) return new Response(null, { status: 404 });

  return Response.json({
    description: job.description,
    requirements: job.requirements,
    skills: parseList(job.skills),
    salary: job.salary,
  });
}
