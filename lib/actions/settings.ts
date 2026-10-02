"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, parseList, serializeList } from "@/lib/db";
import { requireAccount, requireUser } from "@/lib/session";
import { INTEREST_KEYS } from "@/lib/types";
import { FOLLOW_PENDING } from "@/lib/follow";
import { isGender } from "@/lib/default-avatar";
import { fail, succeed, type ActionState } from "./types";

const preferencesSchema = z.object({
  pushEnabled: z.boolean(),
  emailDigest: z.boolean(),
  showReadReceipts: z.boolean(),
  analyticsConsent: z.boolean(),
  showOnlineStatus: z.boolean(),
  showLastActive: z.boolean(),
  isPrivate: z.boolean(),
  autoAcceptFollows: z.boolean(),
});

export async function savePreferences(input: {
  pushEnabled: boolean;
  emailDigest: boolean;
  showReadReceipts: boolean;
  analyticsConsent: boolean;
  showOnlineStatus: boolean;
  showLastActive: boolean;
  isPrivate: boolean;
  autoAcceptFollows: boolean;
}): Promise<ActionState> {
  const me = await requireUser();

  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) return fail("errors.generic");

  const before = await db.user.findUnique({ where: { id: me.id }, select: { isPrivate: true } });
  await db.user.update({ where: { id: me.id }, data: parsed.data });

  // Kalimi nga privat në publik nuk i lë njerëzit të presin: kërkesat në pritje
  // pranohen vetë, sepse profili tani hapet për këdo.
  if (before?.isPrivate && !parsed.data.isPrivate) {
    await acceptAllFollowRequests(me.id);
  }

  revalidatePath("/cilesimet");
  return succeed("settings.saved");
}

export async function saveUsername(raw: string): Promise<ActionState> {
  const me = await requireUser();

  const username = raw.trim().toLowerCase();
  if (!/^[a-z0-9_.]{3,24}$/.test(username)) return fail("errors.generic");

  const taken = await db.user.findFirst({
    where: { username, NOT: { id: me.id } },
    select: { id: true },
  });
  if (taken) return fail("settings.usernameTaken");

  await db.user.update({ where: { id: me.id }, data: { username } });

  revalidatePath("/cilesimet");
  revalidatePath("/une");
  return succeed("settings.saved");
}

/**
 * Gjinia e avatarit të parazgjedhur: djalë, vajzë, ose pa thënë (null). Nuk
 * përdoret për asgjë tjetër, as nuk shfaqet te profili.
 */
export async function saveGender(value: string | null): Promise<ActionState> {
  const me = await requireAccount();
  if (value !== null && !isGender(value)) return fail("errors.generic");

  await db.user.update({ where: { id: me.id }, data: { gender: value } });

  revalidatePath("/", "layout");
  return succeed("settings.saved");
}

/** Fotoja e profilit dhe kopertina. */
export async function saveProfileImages(input: {
  avatarId?: string | null;
  coverId?: string | null;
}): Promise<ActionState> {
  // Fotoja e profilit vendoset edhe te hapi i hyrjes, para se llogaria të mbyllet.
  const me = await requireAccount();

  const data: { avatar?: string | null; cover?: string | null } = {};

  for (const [field, raw] of [
    ["avatar", input.avatarId],
    ["cover", input.coverId],
  ] as const) {
    if (raw === undefined) continue;

    if (raw === null) {
      data[field] = null;
      continue;
    }

    // Vetëm skedarë që ekzistojnë vërtet dhe që i ka ngarkuar ky përdorues.
    const asset = await db.mediaAsset.findFirst({
      where: { id: raw, kind: "image", claims: { some: { userId: me.id } } },
      select: { id: true },
    });
    if (!asset) return fail("errors.generic");

    data[field] = `/api/media/${asset.id}`;
  }

  if (Object.keys(data).length === 0) return succeed();

  await db.user.update({ where: { id: me.id }, data });

  revalidatePath("/cilesimet");
  revalidatePath(`/u/${me.username}`);
  revalidatePath("/une");
  return succeed("settings.saved");
}

/** Bio-ja. E shkruan studenti, kurrë e gjeneruar. */
export async function saveBio(raw: string): Promise<ActionState> {
  const me = await requireUser();

  const bio = raw.trim().slice(0, 250);
  await db.user.update({ where: { id: me.id }, data: { bio: bio || null } });

  revalidatePath("/cilesimet");
  revalidatePath(`/u/${me.username}`);
  return succeed("settings.saved");
}

export async function saveMyInterests(interests: string[]): Promise<ActionState> {
  const me = await requireUser();

  const clean = interests.filter((item) =>
    (INTEREST_KEYS as readonly string[]).includes(item),
  );

  await db.user.update({ where: { id: me.id }, data: { interests: serializeList(clean) } });

  revalidatePath("/cilesimet");
  return succeed("settings.saved");
}

/**
 * Eksporti i të dhënave.
 *
 * E drejta sipas Ligjit Nr. 06/L-082 ushtrohet vetë, pa e shkruar askush. Dalin
 * vetëm të dhënat e vetë përdoruesit: mesazhet e të tjerëve nuk janë të tijat.
 */
export async function exportMyData(): Promise<ActionState & { payload?: string }> {
  const me = await requireUser();

  const [user, posts, materials, answers, notifications] = await Promise.all([
    db.user.findUnique({
      where: { id: me.id },
      select: {
        name: true,
        username: true,
        email: true,
        bio: true,
        city: true,
        highSchool: true,
        year: true,
        level: true,
        interests: true,
        xpContribution: true,
        xpActivity: true,
        dailyStreak: true,
        createdAt: true,
      },
    }),
    db.post.findMany({
      where: { authorId: me.id },
      select: { text: true, type: true, scope: true, createdAt: true },
    }),
    db.material.findMany({
      where: { uploaderId: me.id },
      select: { title: true, type: true, downloads: true, createdAt: true },
    }),
    db.answer.findMany({
      where: { authorId: me.id },
      select: { text: true, votes: true, createdAt: true },
    }),
    db.notification.count({ where: { userId: me.id } }),
  ]);

  const payload = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      profile: user ? { ...user, interests: parseList(user.interests) } : null,
      posts,
      materials,
      answers,
      notificationCount: notifications,
    },
    null,
    2,
  );

  return { ...succeed("settings.exported"), payload };
}

/** Fshirja e llogarisë. Kaskada e Prisma-s merr me vetë gjithçka të lidhur. */
export async function deleteMyAccount(confirmation: string): Promise<ActionState> {
  const me = await requireUser();

  const accepted = ["fshije", "delete"];
  if (!accepted.includes(confirmation.trim().toLowerCase())) return fail("errors.generic");

  await db.user.delete({ where: { id: me.id } });

  revalidatePath("/", "layout");
  return succeed();
}

/** Kur profili bëhet publik, çdo kërkesë në pritje bëhet ndjekje. */
async function acceptAllFollowRequests(userId: string) {
  const pending = await db.follow.findMany({
    where: { followingId: userId, status: FOLLOW_PENDING },
    select: { followerId: true },
  });
  if (pending.length === 0) return;

  await db.follow.updateMany({
    where: { followingId: userId, status: FOLLOW_PENDING },
    data: { status: "accepted" },
  });

  const requesterIds = pending.map((row) => row.followerId);
  const reverse = await db.follow.findMany({
    where: { followerId: userId, followingId: { in: requesterIds }, status: "accepted" },
    select: { followingId: true },
  });
  const mutualIds = reverse.map((row) => row.followingId);
  if (mutualIds.length > 0) {
    await db.follow.updateMany({
      where: { followingId: userId, followerId: { in: mutualIds } },
      data: { isMutual: true },
    });
    await db.follow.updateMany({
      where: { followerId: userId, followingId: { in: mutualIds } },
      data: { isMutual: true },
    });
  }

  await db.notification.deleteMany({ where: { userId, type: "follow_request" } });
}
