"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireParticipant } from "@/lib/session";
import { screen } from "@/lib/moderation";
import { awardActivityXp } from "@/lib/rewards";
import { EVENT_KINDS } from "@/lib/types";
import { fail, succeed, type ActionState } from "./types";

const eventSchema = z.object({
  title: z.string().trim().min(4).max(120),
  description: z.string().trim().min(10).max(2000),
  date: z.string().min(1),
  location: z.string().trim().min(2).max(120),
  kind: z.enum(EVENT_KINDS),
});

export async function createEvent(input: {
  title: string;
  description: string;
  date: string;
  location: string;
  kind: string;
}): Promise<ActionState & { eventId?: string }> {
  const me = await requireParticipant();

  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return fail("errors.generic");

  const when = new Date(parsed.data.date);
  if (Number.isNaN(when.getTime())) return fail("errors.generic");

  const verdict = await screen(`${parsed.data.title} ${parsed.data.description}`);
  if (!verdict.allowed) return fail(`guard.${verdict.category}`);

  const event = await db.event.create({
    data: {
      creatorId: me.id,
      title: parsed.data.title,
      description: parsed.data.description,
      date: when,
      location: parsed.data.location,
      kind: parsed.data.kind,
      facultyId: me.facultyId,
    },
  });

  // Krijuesi shkon gjithmonë: një event pa askënd duket i braktisur.
  await db.rsvp.create({ data: { eventId: event.id, userId: me.id, status: "going" } });
  await awardActivityXp(me.id, "post");

  revalidatePath("/eventet");
  return { ...succeed("campus.eventCreated"), eventId: event.id };
}

/** RSVP është ndërruese: i njëjti status dy herë e heq përgjigjen. */
export async function setRsvp(
  eventId: string,
  status: "going" | "maybe" | "no",
): Promise<ActionState & { status?: string | null }> {
  const me = await requireParticipant();

  const existing = await db.rsvp.findUnique({
    where: { eventId_userId: { eventId, userId: me.id } },
  });

  if (existing?.status === status) {
    await db.rsvp.delete({ where: { id: existing.id } });
    revalidatePath(`/eventet/${eventId}`);
    return { ...succeed(), status: null };
  }

  await db.rsvp.upsert({
    where: { eventId_userId: { eventId, userId: me.id } },
    create: { eventId, userId: me.id, status },
    update: { status },
  });

  revalidatePath(`/eventet/${eventId}`);
  revalidatePath("/eventet");
  return { ...succeed(), status };
}
