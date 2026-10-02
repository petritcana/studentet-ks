import "server-only";

import { db } from "@/lib/db";

/**
 * Njoftim për shumë studentë njëherësh: kuizi i ri ditor, fundi i javës, fituesi.
 *
 * Shkruhet me një pyetje, jo një për student. Kush e ka fikur kategorinë «Gara»
 * te cilësimet nuk e merr. Njoftimi me të njëjtin `groupKey` nuk dyfishohet.
 */
export async function notifyMany(input: {
  userIds: string[];
  type: string;
  targetId?: string | null;
  targetType?: string | null;
  payload?: Record<string, string | number>;
  groupKey: string;
}) {
  const ids = [...new Set(input.userIds)];
  if (ids.length === 0) return 0;

  const [muted, already] = await db.$transaction([
    db.notificationSetting.findMany({
      where: { userId: { in: ids }, category: "competition", inApp: false },
      select: { userId: true },
    }),
    db.notification.findMany({
      where: { userId: { in: ids }, groupKey: input.groupKey },
      select: { userId: true },
    }),
  ]);
  const skip = new Set([...muted, ...already].map((row) => row.userId));
  const recipients = ids.filter((id) => !skip.has(id));
  if (recipients.length === 0) return 0;

  await db.notification.createMany({
    data: recipients.map((userId) => ({
      userId,
      category: "competition",
      type: input.type,
      targetId: input.targetId ?? null,
      targetType: input.targetType ?? null,
      payload: JSON.stringify(input.payload ?? {}),
      groupKey: input.groupKey,
    })),
  });
  return recipients.length;
}

/** Studentët që kanë garuar në dy javët e fundit: vetëm ata marrin njoftimet e përgjithshme. */
export async function engagedPlayers(universityIds?: string[]) {
  const since = new Date(Date.now() - 14 * 86_400_000);
  const rows = await db.competitionPoint.findMany({
    where: {
      createdAt: { gte: since },
      revokedAt: null,
      ...(universityIds ? { universityId: { in: universityIds } } : {}),
    },
    distinct: ["userId"],
    select: { userId: true },
    take: 5000,
  });
  return rows.map((row) => row.userId);
}
