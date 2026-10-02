"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { hasFeature, PRO_LIMITS } from "@/lib/permissions";
import { FOLLOW_AUDIENCES, MESSAGE_AUDIENCES, PRO_ACCENTS, PRO_COVERS, PROFILE_THEMES } from "@/lib/pro";
import { requireUser } from "@/lib/session";
import { fail, succeed, type ActionState } from "./types";

/**
 * Veçoritë e Pro-s që e prekin profilin dhe postimet.
 *
 * Çdo kontroll bëhet këtu, në server. Fshehja e një butoni te ndërfaqja është
 * paraqitje, jo siguri: kush e dërgon kërkesën me dorë duhet të ndalet nga e
 * njëjta rregull që e fsheh butonin.
 *
 * Kufijtë rrinë te `PRO_LIMITS`, jo të shpërndarë nëpër veprime.
 */

/** Postimi i ngulur: një i vetëm, gjithmonë i yti, kurrë anonim. */
export async function pinPost(postId: string): Promise<ActionState> {
  const me = await requireUser();
  if (!hasFeature(me.actor, "pinned_post")) return fail("pro.lockedPin");

  const post = await db.post.findFirst({
    where: { id: postId, authorId: me.id, isHidden: false },
    select: { id: true, isAnonymous: true },
  });
  if (!post) return fail("errors.notFoundContent");
  // Një postim anonim i ngulur te profili do ta zhbënte vetë anonimitetin.
  if (post.isAnonymous) return fail("pro.errorAnonymous");

  await db.user.update({ where: { id: me.id }, data: { pinnedPostId: post.id } });

  revalidatePath(`/u/${me.username}`);
  revalidatePath("/une");
  return succeed("pro.pinned");
}

export async function unpinPost(): Promise<ActionState> {
  const me = await requireUser();

  await db.user.update({ where: { id: me.id }, data: { pinnedPostId: null } });

  revalidatePath(`/u/${me.username}`);
  revalidatePath("/une");
  return succeed("pro.unpinned");
}

/**
 * Veçimi i një postimi.
 *
 * Zgjat pak ditë dhe vetëm një njëherësh. Pa kufi, çdo postim i një përdoruesi
 * Pro do të ishte i veçuar, dhe veçimi nuk do të thoshte më asgjë për askënd.
 */
export async function featurePost(postId: string): Promise<ActionState> {
  const me = await requireUser();
  if (!hasFeature(me.actor, "featured_post")) return fail("pro.lockedFeature");

  const post = await db.post.findFirst({
    where: { id: postId, authorId: me.id, isHidden: false, isAnonymous: false },
    select: { id: true },
  });
  if (!post) return fail("errors.notFoundContent");

  const now = new Date();
  const active = await db.post.count({
    where: { authorId: me.id, featuredUntil: { gt: now }, NOT: { id: post.id } },
  });
  if (active >= PRO_LIMITS.featuredPosts) return fail("pro.errorFeatureLimit");

  await db.post.update({
    where: { id: post.id },
    data: { featuredUntil: new Date(now.getTime() + PRO_LIMITS.featuredPostDays * 86_400_000) },
  });

  revalidatePath("/feed");
  revalidatePath(`/u/${me.username}`);
  return succeed("pro.featured");
}

export async function unfeaturePost(postId: string): Promise<ActionState> {
  const me = await requireUser();

  await db.post.updateMany({
    where: { id: postId, authorId: me.id },
    data: { featuredUntil: null },
  });

  revalidatePath("/feed");
  revalidatePath(`/u/${me.username}`);
  return succeed("pro.unfeatured");
}

/** Profili i veçuar: dukshmëri shtesë te sugjerimet, me afat. */
export async function featureProfile(on: boolean): Promise<ActionState> {
  const me = await requireUser();
  if (!hasFeature(me.actor, "featured_profile")) return fail("pro.lockedProfile");

  await db.user.update({
    where: { id: me.id },
    data: {
      featuredUntil: on
        ? new Date(Date.now() + PRO_LIMITS.featuredProfileDays * 86_400_000)
        : null,
    },
  });

  revalidatePath("/cilesimet");
  revalidatePath("/komuniteti");
  return succeed(on ? "pro.profileFeatured" : "pro.profileUnfeatured");
}

/**
 * Pamja premium e profilit.
 *
 * Zgjedhjet janë të kufizuara me qëllim: theksi vjen nga paleta e platformës dhe
 * kopertina nga tri stile të gatshme. Një profil Pro duhet të duket më i yti,
 * jo nga një platformë tjetër.
 */
const appearanceSchema = z.object({
  accent: z.enum(PRO_ACCENTS).nullable(),
  coverStyle: z.enum(PRO_COVERS).nullable(),
});

export async function saveProAppearance(
  input: z.input<typeof appearanceSchema>,
): Promise<ActionState> {
  const me = await requireUser();
  if (!hasFeature(me.actor, "premium_profile")) return fail("pro.lockedAppearance");

  const parsed = appearanceSchema.safeParse(input);
  if (!parsed.success) return fail("errors.generic");

  await db.user.update({
    where: { id: me.id },
    data: { proAccent: parsed.data.accent, proCoverStyle: parsed.data.coverStyle },
  });

  revalidatePath(`/u/${me.username}`);
  revalidatePath("/cilesimet");
  revalidatePath("/une");
  return succeed("pro.appearanceSaved");
}

/**
 * Dizajni i profilit: një nga pesë dizajnet dhe ngjyra e emrit.
 *
 * Vetëm Pro, dhe vetëm te profili. Ngjyra e emrit është e lirë (#rrggbb): studenti
 * vendos vetë si duket emri i tij, në temën e çelët dhe në të errët njësoj.
 */
const designSchema = z.object({
  theme: z.enum(PROFILE_THEMES).nullable(),
  nameColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable(),
});

export async function saveProfileDesign(input: z.input<typeof designSchema>): Promise<ActionState> {
  const me = await requireUser();
  if (!hasFeature(me.actor, "premium_profile")) return fail("pro.lockedAppearance");

  const parsed = designSchema.safeParse(input);
  if (!parsed.success) return fail("errors.generic");

  await db.user.update({
    where: { id: me.id },
    data: { profileTheme: parsed.data.theme, nameColor: parsed.data.nameColor?.toLowerCase() ?? null },
  });

  revalidatePath(`/u/${me.username}`);
  revalidatePath("/une");
  return succeed("pro.designSaved");
}

/**
 * Privatësia e avancuar.
 *
 * Çdo çelës këtu ndryshon vërtet sjelljen e aplikacionit: kush të ndjek dot,
 * kush të shkruan dot, çfarë shihet për praninë. Një çelës që vetëm duket do
 * të ishte më keq se mungesa e tij, sepse studenti do të besonte se është i
 * mbrojtur kur nuk është.
 */
const privacySchema = z.object({
  whoCanFollow: z.enum(FOLLOW_AUDIENCES),
  whoCanMessage: z.enum(MESSAGE_AUDIENCES),
});

export async function saveAdvancedPrivacy(
  input: z.input<typeof privacySchema>,
): Promise<ActionState> {
  const me = await requireUser();
  if (!hasFeature(me.actor, "advanced_privacy")) return fail("pro.lockedPrivacy");

  const parsed = privacySchema.safeParse(input);
  if (!parsed.success) return fail("errors.generic");

  await db.user.update({ where: { id: me.id }, data: parsed.data });

  revalidatePath("/cilesimet");
  return succeed("settings.saved");
}
