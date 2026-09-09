"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, serializeList } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { rateLimit, rateLimitMessage } from "@/lib/rate-limit";
import { screen } from "@/lib/moderation";
import { EVENT_KINDS } from "@/lib/constants";
import { fail, succeed, type ActionState } from "./types";

// --- eventet ---------------------------------------------------------------

export async function setRsvp(
  eventId: string,
  status: "going" | "maybe" | "not_going",
): Promise<ActionState> {
  const me = await requireUser();

  await db.rsvp.upsert({
    where: { eventId_userId: { eventId, userId: me.id } },
    create: { eventId, userId: me.id, status },
    update: { status },
  });

  revalidatePath(`/eventet/${eventId}`);
  revalidatePath("/kampusi");
  return succeed(
    status === "going" ? "Po vjen. E shënuam." : status === "maybe" ? "Ndoshta. E shënuam." : "E hoqëm.",
  );
}

const eventSchema = z.object({
  title: z.string().trim().min(5, "Titulli është shumë i shkurtër.").max(120),
  description: z.string().trim().min(10, "Shkruaj dy fjalë më shumë.").max(2000),
  location: z.string().trim().min(3, "Ku mbahet?").max(160),
  date: z.string().min(1, "Zgjidh datën dhe orën."),
  kind: z.enum(EVENT_KINDS),
});

export async function createEvent(input: {
  title: string;
  description: string;
  location: string;
  date: string;
  kind: string;
}): Promise<ActionState & { eventId?: string }> {
  const me = await requireUser();

  const limit = rateLimit("post", me.id);
  if (!limit.ok) return fail(rateLimitMessage(limit));

  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Eventi s'është i plotë.");
  }

  const verdict = await screen(`${parsed.data.title} ${parsed.data.description}`);
  if (!verdict.allowed) return fail(verdict.message ?? "Ky tekst nuk kalon.");

  const date = new Date(parsed.data.date);
  if (Number.isNaN(date.getTime())) return fail("Data s'është e vlefshme.");

  const event = await db.event.create({
    data: {
      creatorId: me.id,
      title: parsed.data.title,
      description: parsed.data.description,
      location: parsed.data.location,
      date,
      kind: parsed.data.kind,
      facultyId: me.facultyId,
    },
  });

  await db.rsvp.create({ data: { eventId: event.id, userId: me.id, status: "going" } });

  await db.post.create({
    data: {
      authorId: me.id,
      type: "event",
      text: `${parsed.data.title} — ${parsed.data.location}. Kush vjen?`,
      eventId: event.id,
      facultyId: me.facultyId,
      media: serializeList([]),
    },
  });

  revalidatePath("/kampusi");
  revalidatePath("/feed");
  return { ...succeed("Eventi u krijua."), eventId: event.id };
}

// --- grupet ----------------------------------------------------------------

export async function joinGroup(groupId: string): Promise<ActionState> {
  const me = await requireUser();
  const group = await db.group.findUnique({
    where: { id: groupId },
    select: { privacy: true },
  });
  if (!group) return fail("Ky grup s'ekziston.");
  if (group.privacy === "invite") {
    return fail("Ky grup hyhet vetëm me ftesë.");
  }

  await db.groupMember.upsert({
    where: { groupId_userId: { groupId, userId: me.id } },
    create: { groupId, userId: me.id },
    update: {},
  });

  revalidatePath(`/grupet/${groupId}`);
  revalidatePath("/kampusi");
  return succeed("Hyre në grup.");
}

export async function leaveGroup(groupId: string): Promise<ActionState> {
  const me = await requireUser();
  await db.groupMember.deleteMany({ where: { groupId, userId: me.id } });
  revalidatePath(`/grupet/${groupId}`);
  return succeed("Dole nga grupi.");
}

const groupSchema = z.object({
  name: z.string().trim().min(3, "Emri është shumë i shkurtër.").max(80),
  description: z.string().trim().max(500).optional(),
  privacy: z.enum(["public", "request", "invite"]),
});

export async function createGroup(input: {
  name: string;
  description?: string;
  privacy: string;
}): Promise<ActionState & { groupId?: string }> {
  const me = await requireUser();
  const parsed = groupSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Grupi s'është i plotë.");
  }

  const verdict = await screen(`${parsed.data.name} ${parsed.data.description ?? ""}`);
  if (!verdict.allowed) return fail(verdict.message ?? "Ky tekst nuk kalon.");

  const faculty = me.facultyId
    ? await db.faculty.findUnique({ where: { id: me.facultyId }, select: { color: true } })
    : null;

  const group = await db.group.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      privacy: parsed.data.privacy,
      type: "custom",
      facultyKey: faculty?.color ?? null,
    },
  });
  await db.groupMember.create({
    data: { groupId: group.id, userId: me.id, role: "owner" },
  });

  revalidatePath("/kampusi");
  return { ...succeed("Grupi u krijua."), groupId: group.id };
}

// --- mesazhet --------------------------------------------------------------

export async function sendMessage(
  conversationId: string,
  text: string,
): Promise<ActionState> {
  const me = await requireUser();

  const limit = rateLimit("message", me.id);
  if (!limit.ok) return fail(rateLimitMessage(limit));

  const trimmed = text.trim();
  if (trimmed.length === 0) return fail("Shkruaj diçka para se ta dërgosh.");
  if (trimmed.length > 2000) return fail("Mesazhi është shumë i gjatë.");

  const membership = await db.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: me.id } },
  });
  if (!membership) return fail("Kjo bisedë nuk është e jotja.");

  const verdict = await screen(trimmed);
  if (!verdict.allowed) return fail(verdict.message ?? "Ky mesazh nuk kalon.");

  await db.message.create({
    data: {
      conversationId,
      authorId: me.id,
      text: trimmed,
      media: serializeList([]),
      readBy: serializeList([me.id]),
    },
  });
  await db.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  revalidatePath(`/mesazhe/${conversationId}`);
  revalidatePath("/mesazhe");
  return succeed();
}

export async function markConversationRead(conversationId: string): Promise<ActionState> {
  const me = await requireUser();
  await db.conversationMember.updateMany({
    where: { conversationId, userId: me.id },
    data: { lastReadAt: new Date() },
  });
  return succeed();
}

/** DM-ja hapet vetë mes shokëve; me të tjerët nis si kërkesë. */
export async function openConversation(
  targetId: string,
): Promise<ActionState & { conversationId?: string }> {
  const me = await requireUser();
  if (me.id === targetId) return fail("Me veten s'ke çfarë të bisedosh.");

  const existing = await db.conversation.findFirst({
    where: {
      type: "direct",
      AND: [
        { members: { some: { userId: me.id } } },
        { members: { some: { userId: targetId } } },
      ],
    },
    select: { id: true },
  });
  if (existing) return { ...succeed(), conversationId: existing.id };

  const mutual = await db.follow.findUnique({
    where: { followerId_followingId: { followerId: me.id, followingId: targetId } },
    select: { isMutual: true },
  });

  const conversation = await db.conversation.create({ data: { type: "direct" } });
  await db.conversationMember.createMany({
    data: [
      { conversationId: conversation.id, userId: me.id, isAccepted: true },
      {
        conversationId: conversation.id,
        userId: targetId,
        isAccepted: Boolean(mutual?.isMutual),
      },
    ],
  });

  return { ...succeed(), conversationId: conversation.id };
}
