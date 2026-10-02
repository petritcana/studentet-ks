"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { CACHE_TAGS } from "@/lib/cache";
import { recordAudit } from "@/lib/audit";
import { ANNOUNCEMENT_KINDS } from "@/lib/announcements";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { fail, succeed, type ActionState } from "./types";

/**
 * Njoftimet e platformës i publikon vetëm admini. Çdo publikim dhe çdo fikje
 * shkruhet te gjurma e adminit.
 */
const announcementSchema = z.object({
  kind: z.enum(ANNOUNCEMENT_KINDS),
  title: z.string().trim().min(3).max(120),
  titleEn: z.string().trim().min(3).max(120),
  body: z.string().trim().min(3).max(400),
  bodyEn: z.string().trim().min(3).max(400),
  place: z.string().trim().max(80).optional(),
  url: z
    .string()
    .trim()
    .max(300)
    .refine((value) => value === "" || value.startsWith("/") || value.startsWith("https://"))
    .optional(),
  eventAt: z.string().optional(),
  endsAt: z.string().optional(),
  // Fotoja: vetëm skedarë të ngarkuar te platforma.
  image: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\/api\/media\/[\w-]+$/.test(value))
    .optional(),
  important: z.boolean(),
});

export type AnnouncementInput = z.input<typeof announcementSchema>;

function parseDate(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createAnnouncement(input: AnnouncementInput): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) return fail("adminAnnouncements.invalid");
  const data = parsed.data;

  const eventAt = parseDate(data.eventAt);
  // Pa datë mbarimi, njoftimi mbyllet vetë një ditë pas eventit, ose pas 30 ditësh.
  const endsAt =
    parseDate(data.endsAt) ??
    (eventAt ? new Date(eventAt.getTime() + 86_400_000) : new Date(Date.now() + 30 * 86_400_000));

  const created = await db.announcement.create({
    data: {
      kind: data.kind,
      title: data.title,
      titleEn: data.titleEn,
      body: data.body,
      bodyEn: data.bodyEn,
      place: data.place || null,
      url: data.url || null,
      image: data.image || null,
      eventAt,
      endsAt,
      priority: data.important ? 2 : 1,
      facultyId: null,
    },
    select: { id: true },
  });

  await recordAudit({ actorId: admin.id, action: "announcement", targetType: "announcement", targetId: created.id });

  revalidateTag(CACHE_TAGS.announcements);
  revalidatePath("/", "layout");
  return succeed("adminAnnouncements.published");
}

export async function setAnnouncementActive(id: string, isActive: boolean): Promise<ActionState> {
  const admin = await requireAdmin();

  const existing = await db.announcement.findUnique({ where: { id }, select: { isActive: true } });
  if (!existing) return fail("errors.notFoundContent");

  await db.announcement.update({ where: { id }, data: { isActive } });
  await recordAudit({
    actorId: admin.id,
    action: "announcement",
    targetType: "announcement",
    targetId: id,
    before: existing,
  });

  revalidateTag(CACHE_TAGS.announcements);
  revalidatePath("/", "layout");
  return succeed();
}

/** Ndryshimi i një njoftimi: teksti, data, vendi, fotoja, rëndësia. Shkruhet te gjurma me gjendjen e mëparshme. */
export async function updateAnnouncement(id: string, input: AnnouncementInput): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) return fail("adminAnnouncements.invalid");
  const data = parsed.data;

  const existing = await db.announcement.findUnique({
    where: { id },
    select: { title: true, body: true, kind: true, image: true, eventAt: true, endsAt: true, priority: true },
  });
  if (!existing) return fail("errors.notFoundContent");

  const eventAt = parseDate(data.eventAt);
  const endsAt =
    parseDate(data.endsAt) ??
    (eventAt ? new Date(eventAt.getTime() + 86_400_000) : existing.endsAt ?? new Date(Date.now() + 30 * 86_400_000));

  await db.announcement.update({
    where: { id },
    data: {
      kind: data.kind,
      title: data.title,
      titleEn: data.titleEn,
      body: data.body,
      bodyEn: data.bodyEn,
      place: data.place || null,
      url: data.url || null,
      image: data.image || null,
      eventAt,
      endsAt,
      priority: data.important ? 2 : 1,
    },
  });
  await recordAudit({ actorId: admin.id, action: "announcement", targetType: "announcement", targetId: id, before: existing });

  revalidateTag(CACHE_TAGS.announcements);
  revalidatePath("/", "layout");
  return succeed("adminAnnouncements.updated");
}

export async function deleteAnnouncement(id: string): Promise<ActionState> {
  const admin = await requireAdmin();
  const existing = await db.announcement.findUnique({ where: { id }, select: { title: true, kind: true } });
  if (!existing) return fail("errors.notFoundContent");

  await db.announcement.delete({ where: { id } });
  await recordAudit({ actorId: admin.id, action: "announcement", targetType: "announcement", targetId: id, before: existing });

  revalidateTag(CACHE_TAGS.announcements);
  revalidatePath("/", "layout");
  return succeed("adminAnnouncements.deleted");
}
