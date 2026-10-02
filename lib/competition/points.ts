import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { kosovoParts } from "@/lib/format";
import { checkAchievements } from "./achievements";
import { recordEvent } from "./feed";
import { allowedPoints, crossedMilestone, dayKey, nextStreak, POINTS, type PointSource } from "./rules";

/**
 * Pikët e garës: shkruhen vetëm këtu, vetëm nga serveri.
 *
 * Tri mbrojtje, në këtë rend:
 *   1. E njëjta (student, burim, id) shkruhet vetëm një herë: çelësi unik i
 *      regjistrit, jo një kontroll që mund të kalohet nga dy kërkesa njëherësh.
 *   2. Çdo burim ka kufi ditor, dhe i gjithë aktiviteti i studentit ka tavan ditor.
 *   3. Vetëm studenti i verifikuar i jep pikë universitetit. I paverifikuari i
 *      mbledh për vete, por universiteti nuk fryhet nga llogari të pasigurta.
 */

/** Mesnata e sotme e Kosovës, si çast. Kufijtë ditorë numërohen prej saj. */
function startOfKosovoDay(now: Date = new Date()) {
  const { hour, minute } = kosovoParts(now);
  const elapsed = ((Number(hour) * 60 + Number(minute)) * 60 + now.getUTCSeconds()) * 1000 + now.getUTCMilliseconds();
  return new Date(now.getTime() - elapsed);
}

export async function awardPoints(input: {
  userId: string;
  source: PointSource;
  sourceId: string;
  /** Për kuizet: numri i përgjigjeve të sakta. Pikët = POINTS[source] × units. */
  units?: number;
}): Promise<number> {
  const since = startOfKosovoDay();
  const [user, countedToday, today] = await Promise.all([
    db.user.findUnique({
      where: { id: input.userId },
      select: { isVerified: true, universityId: true, facultyId: true, role: true },
    }),
    db.competitionPoint.count({
      where: { userId: input.userId, source: input.source, createdAt: { gte: since }, revokedAt: null },
    }),
    db.competitionPoint.aggregate({
      where: { userId: input.userId, createdAt: { gte: since }, revokedAt: null },
      _sum: { points: true },
    }),
  ]);
  if (!user) return 0;

  const points = allowedPoints({
    source: input.source,
    points: POINTS[input.source] * (input.units ?? 1),
    countedToday,
    pointsToday: today._sum.points ?? 0,
  });
  if (points <= 0) return 0;

  const universityId = user.isVerified ? user.universityId : null;
  const before = universityId ? await universityTotal(universityId) : 0;

  try {
    await db.competitionPoint.create({
      data: {
        userId: input.userId,
        universityId,
        facultyId: user.facultyId,
        source: input.source,
        sourceId: input.sourceId,
        points,
      },
    });
  } catch (error) {
    // I njëjti veprim, i dyti: çelësi unik e ndaloi. Nuk është gabim, thjesht asgjë.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return 0;
    throw error;
  }

  await touchActivity(input.userId);

  if (universityId) {
    const milestone = crossedMilestone(before, before + points);
    if (milestone) {
      await recordEvent({ kind: "university_milestone", universityId, payload: { points: milestone } });
    }
  }

  await checkAchievements(input.userId);
  return points;
}

/** Përmbajtja e fshirë ose e moderuar nuk vazhdon të japë pikë. */
export async function revokePoints(source: PointSource, sourceId: string) {
  await db.competitionPoint.updateMany({
    where: { source, sourceId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function universityTotal(universityId: string, since?: Date) {
  const sum = await db.competitionPoint.aggregate({
    where: { universityId, revokedAt: null, ...(since ? { createdAt: { gte: since } } : {}) },
    _sum: { points: true },
  });
  return sum._sum.points ?? 0;
}

/** Seria e ditëve: çdo ditë me aktivitet gare e zgjat, një ditë pushim e rinis. */
export async function touchActivity(userId: string) {
  const today = dayKey();
  const stats = await db.competitorStats.findUnique({
    where: { userId },
    select: { lastActiveDay: true, streak: true },
  });
  const streak = nextStreak(stats?.lastActiveDay ?? null, stats?.streak ?? 0, today);
  await db.competitorStats.upsert({
    where: { userId },
    create: { userId, streak, lastActiveDay: today },
    update: { streak, lastActiveDay: today },
  });
}

export { startOfKosovoDay };
