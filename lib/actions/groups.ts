"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { screen } from "@/lib/moderation";
import { can, hasFeature, PRO_LIMITS } from "@/lib/permissions";
import { requireUser, requireParticipant } from "@/lib/session";
import { fail, succeed, type ActionState } from "./types";

/**
 * Grupet.
 *
 * Grupi i lëndës hapet automatikisht për këdo që e ka atë lëndë: nuk ka kuptim
 * të kërkosh leje për të hyrë atje ku tashmë studion. Grupet me privatësi
 * `request` dhe `invite` presin një anëtar ekzistues.
 */
export async function joinGroup(groupId: string): Promise<ActionState> {
  const me = await requireParticipant();

  const group = await db.group.findUnique({
    where: { id: groupId },
    select: { id: true, privacy: true, type: true, courseId: true },
  });
  if (!group) return fail("errors.notFoundContent");

  const enrolled = group.courseId
    ? await db.enrollment.findFirst({
        where: { userId: me.id, courseId: group.courseId },
        select: { id: true },
      })
    : null;

  if (group.privacy === "invite" && !enrolled) return fail("errors.forbidden");

  await db.groupMember.upsert({
    where: { groupId_userId: { groupId, userId: me.id } },
    create: {
      groupId,
      userId: me.id,
      role: group.privacy === "request" && !enrolled ? "pending" : "member",
    },
    update: {},
  });

  revalidatePath(`/grupet/${groupId}`);
  revalidatePath("/kampusi");
  return succeed(group.privacy === "request" && !enrolled ? "campus.joinRequest" : "campus.joined");
}

export async function leaveGroup(groupId: string): Promise<ActionState> {
  const me = await requireUser();
  await db.groupMember.deleteMany({ where: { groupId, userId: me.id } });
  revalidatePath(`/grupet/${groupId}`);
  revalidatePath("/kampusi");
  return succeed();
}

/**
 * Hapja e një grupi.
 *
 * Grupi është hapësirë e studentëve, prandaj e hap studenti, jo admini. Kufiri
 * i numrit rri te `PRO_LIMITS`: pa të, një llogari e vetme do të mbushte listën
 * e grupeve dhe zbulimi do të bëhej i padobishëm.
 *
 * Krijuesi hyn si `owner`, që të ketë kush ta mbajë grupin dhe ta moderojë.
 */
export async function createGroup(input: {
  name: string;
  description?: string;
  privacy?: string;
}): Promise<ActionState & { groupId?: string }> {
  const me = await requireParticipant();

  if (!can(me.actor, "create_group").allowed) return fail("verify.lockedTitle");

  const name = input.name.trim();
  if (name.length < 3 || name.length > 60) return fail("campus.errorGroupName");

  const privacy = ["public", "request", "invite"].includes(input.privacy ?? "")
    ? (input.privacy as string)
    : "public";

  const limit = hasFeature(me.actor, "advanced_groups")
    ? PRO_LIMITS.groupsPro
    : PRO_LIMITS.groupsFree;

  const owned = await db.groupMember.count({ where: { userId: me.id, role: "owner" } });
  if (owned >= limit) return fail("campus.errorGroupLimit");

  const verdict = await screen(`${name} ${input.description ?? ""}`);
  if (!verdict.allowed) return fail(`guard.${verdict.category}`);

  const group = await db.group.create({
    data: {
      name,
      nameEn: name,
      type: "custom",
      privacy,
      description: input.description?.trim().slice(0, 300) || null,
      // Grupi lind te fakulteti i krijuesit: aty e gjejnë të tjerët.
      facultyKey: me.faculty?.color ?? null,
      members: { create: { userId: me.id, role: "owner" } },
    },
    select: { id: true },
  });

  revalidatePath("/komuniteti");
  return { ...succeed("campus.groupCreated"), groupId: group.id };
}

/** Pranimi i një kërkese për anëtarësim. E bën vetëm pronari i grupit. */
export async function decideGroupRequest(
  groupId: string,
  userId: string,
  accept: boolean,
): Promise<ActionState> {
  const me = await requireUser();

  const owner = await db.groupMember.findFirst({
    where: { groupId, userId: me.id, role: "owner" },
    select: { id: true },
  });
  if (!owner) return fail("errors.forbidden");

  if (accept) {
    await db.groupMember.updateMany({
      where: { groupId, userId, role: "pending" },
      data: { role: "member" },
    });
  } else {
    await db.groupMember.deleteMany({ where: { groupId, userId, role: "pending" } });
  }

  revalidatePath(`/grupet/${groupId}`);
  return succeed();
}
