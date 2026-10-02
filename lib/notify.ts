import "server-only";

import { db } from "@/lib/db";
import { postScopeFilter, type AccessUser } from "@/lib/access";
import { extractMentions } from "@/lib/mentions";
import type { NotificationCategory } from "@/lib/notifications";

/**
 * Krijimi i një njoftimi, në një vend të vetëm.
 *
 * Dikur çdo veprim e shkruante vetë rreshtin te `Notification`, dhe pasoja ishte
 * se preferencat e studentit nuk i lexonte askush: çelësat ekzistonin, por asgjë
 * nuk i pyeste. Tani çdo njoftim kalon këtej, dhe kategoria e fikur nuk shkruhet
 * fare.
 *
 * `groupKey` e mban grumbullimin të kuptimtë: dhjetë pëlqime te i njëjti postim
 * janë një rresht, jo dhjetë. Kur njoftimi i grupit ekziston dhe është i palexuar,
 * përditësohet koha e tij në vend që të shtohet një i dytë.
 */
export type NotifyInput = {
  userId: string;
  category: NotificationCategory;
  type: string;
  actorId?: string | null;
  targetId?: string | null;
  targetType?: string | null;
  payload?: Record<string, string | number>;
  groupKey?: string | null;
};

/** A i pranon ky student njoftimet e kësaj kategorie brenda aplikacionit. */
async function acceptsInApp(userId: string, category: NotificationCategory) {
  const setting = await db.notificationSetting.findUnique({
    where: { userId_category: { userId, category } },
    select: { inApp: true },
  });
  // Pa rresht, vlen parazgjedhja: brenda aplikacionit po.
  return setting?.inApp ?? true;
}

export async function notify(input: NotifyInput): Promise<boolean> {
  // Askush nuk njoftohet për veprimin e vet.
  if (input.actorId && input.actorId === input.userId) return false;

  if (!(await acceptsInApp(input.userId, input.category))) return false;

  if (input.groupKey) {
    const existing = await db.notification.findFirst({
      where: { userId: input.userId, groupKey: input.groupKey, isRead: false },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      // I njëjti grup, i palexuar: ngrihet lart, nuk dyfishohet.
      await db.notification.update({
        where: { id: existing.id },
        data: {
          createdAt: new Date(),
          actorId: input.actorId ?? null,
          payload: JSON.stringify(input.payload ?? {}),
        },
      });
      return true;
    }
  }

  await db.notification.create({
    data: {
      userId: input.userId,
      category: input.category,
      type: input.type,
      actorId: input.actorId ?? null,
      targetId: input.targetId ?? null,
      targetType: input.targetType ?? null,
      payload: JSON.stringify(input.payload ?? {}),
      groupKey: input.groupKey ?? null,
    },
  });

  return true;
}

/**
 * Përmendjet te një tekst: username-at e shkruar me `@`, pa dyfishime. Rregulli
 * është i njëjti që përdor ndërfaqja për lidhjet (`lib/mentions.ts`).
 */
export function mentionsIn(text: string): string[] {
  return extractMentions(text);
}

/**
 * Njofton të përmendurit te një postim, koment ose storje.
 *
 * Njoftohet vetëm kush ekziston, kush nuk është bllokuar në asnjë drejtim, dhe,
 * te postimet e komentet, vetëm kush e sheh vërtet postimin: një përmendje që
 * të çon në një faqe që nuk hapet është zhurmë. Te storja, njoftimi të çon te
 * profili i autorit, ku storja shihet.
 */
export async function notifyMentions(
  input:
    | { text: string; actorId: string; targetId: string; targetType: "post" | "comment"; postId: string }
    | { text: string; actorId: string; targetType: "story"; authorUsername: string },
): Promise<number> {
  const usernames = mentionsIn(input.text);
  if (usernames.length === 0) return 0;

  const people = await db.user.findMany({
    where: { username: { in: usernames }, NOT: { id: input.actorId } },
    select: {
      id: true,
      role: true,
      universityId: true,
      facultyId: true,
      proEarnedUntil: true,
      subscriptions: { where: { status: "active" }, select: { status: true, expiresAt: true } },
      enrollments: { select: { courseId: true } },
    },
  });
  if (people.length === 0) return 0;

  const blocks = await db.userBlock.findMany({
    where: {
      OR: [
        { blockerId: input.actorId, blockedId: { in: people.map((person) => person.id) } },
        { blockedId: input.actorId, blockerId: { in: people.map((person) => person.id) } },
      ],
    },
    select: { blockerId: true, blockedId: true },
  });
  const blocked = new Set(blocks.flatMap((row) => [row.blockerId, row.blockedId]));

  let sent = 0;
  for (const person of people) {
    if (blocked.has(person.id)) continue;
    if (input.targetType !== "story") {
      const access: AccessUser = person;
      const visible = await db.post.count({ where: { id: input.postId, ...postScopeFilter(access) } });
      if (!visible) continue;
    }
    const created = await notify({
      userId: person.id,
      category: "social",
      type: input.targetType === "story" ? "mention_story" : "mention",
      actorId: input.actorId,
      targetId: input.targetType === "story" ? input.authorUsername : input.postId,
      targetType: input.targetType === "story" ? "profile" : "post",
      // Një përmendje për vend mjafton: dy nga i njëjti person te i njëjti vend
      // nuk i thonë studentit asgjë më shumë.
      groupKey:
        input.targetType === "story"
          ? `mention_story:${input.authorUsername}:${new Date().toISOString().slice(0, 10)}`
          : `mention:${input.postId}:${input.actorId}`,
    });
    if (created) sent += 1;
  }

  return sent;
}
