"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, parseList, serializeList } from "@/lib/db";
import { signOut } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { INTERESTS } from "@/lib/constants";
import { fail, succeed, type ActionState } from "./types";

const profileSchema = z.object({
  name: z.string().trim().min(3, "Shkruaj emrin dhe mbiemrin.").max(60),
  username: z
    .string()
    .trim()
    .min(3, "Emri i përdoruesit është shumë i shkurtër.")
    .max(30)
    .regex(/^[a-z0-9._]+$/, "Lejohen vetëm shkronja të vogla, numra, pikë dhe nënvijë."),
  bio: z.string().trim().max(160, "Bio-ja duhet të jetë nën 160 shkronja.").optional(),
  city: z.string().trim().max(40).optional(),
  highSchool: z.string().trim().max(120).optional(),
});

export async function updateProfile(input: {
  name: string;
  username: string;
  bio?: string;
  city?: string;
  highSchool?: string;
}): Promise<ActionState> {
  const me = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0] ?? "form")] = issue.message;
    }
    return fail("Rregullo fushat e shënuara.", fieldErrors);
  }

  if (parsed.data.username !== me.username) {
    const taken = await db.user.findUnique({ where: { username: parsed.data.username } });
    if (taken) {
      return fail("Ky emër përdoruesi është zënë.", {
        username: "Provo një tjetër.",
      });
    }
  }

  await db.user.update({
    where: { id: me.id },
    data: {
      name: parsed.data.name,
      username: parsed.data.username,
      bio: parsed.data.bio || null,
      city: parsed.data.city || null,
      highSchool: parsed.data.highSchool || null,
    },
  });

  revalidatePath("/cilesimet");
  revalidatePath("/une");
  return succeed("E ruajtëm.");
}

export async function updateInterests(interests: string[]): Promise<ActionState> {
  const me = await requireUser();
  const valid = interests.filter((item) => (INTERESTS as readonly string[]).includes(item));
  await db.user.update({
    where: { id: me.id },
    data: { interests: serializeList(valid) },
  });
  revalidatePath("/cilesimet");
  return succeed("E ruajtëm.");
}

export async function updateCourses(courseIds: string[]): Promise<ActionState> {
  const me = await requireUser();
  const unique = [...new Set(courseIds)].slice(0, 14);
  const academicYear = "2025/26";

  const courses = await db.course.findMany({
    where: { id: { in: unique } },
    select: { id: true },
  });

  await db.enrollment.deleteMany({ where: { userId: me.id, academicYear } });
  await db.enrollment.createMany({
    data: courses.map((course) => ({
      userId: me.id,
      courseId: course.id,
      academicYear,
    })),
  });

  for (const course of courses) {
    const group = await db.group.findFirst({
      where: { courseId: course.id, type: "course" },
      select: { id: true },
    });
    if (group) {
      await db.groupMember.upsert({
        where: { groupId_userId: { groupId: group.id, userId: me.id } },
        create: { groupId: group.id, userId: me.id },
        update: {},
      });
    }
  }

  revalidatePath("/cilesimet");
  revalidatePath("/une");
  revalidatePath("/materialet");
  return succeed("Orari u rifreskua.");
}

export async function updatePreferences(input: {
  showReadReceipts?: boolean;
  pushEnabled?: boolean;
  analyticsConsent?: boolean;
}): Promise<ActionState> {
  const me = await requireUser();
  await db.user.update({
    where: { id: me.id },
    data: {
      ...(input.showReadReceipts !== undefined
        ? { showReadReceipts: input.showReadReceipts }
        : {}),
      ...(input.pushEnabled !== undefined ? { pushEnabled: input.pushEnabled } : {}),
      ...(input.analyticsConsent !== undefined
        ? { analyticsConsent: input.analyticsConsent }
        : {}),
    },
  });
  revalidatePath("/cilesimet");
  return succeed("E ruajtëm.");
}

/**
 * E drejta e eksportit sipas Ligjit Nr. 06/L-082. Kthen gjithçka që mban
 * platforma për këtë llogari, pa të dhëna të përdoruesve të tjerë.
 */
export async function exportMyData(): Promise<ActionState & { payload?: string }> {
  const me = await requireUser();

  const [user, posts, comments, materials, answers, questions, bookmarks, follows, events] =
    await Promise.all([
      db.user.findUnique({
        where: { id: me.id },
        select: {
          email: true,
          username: true,
          name: true,
          bio: true,
          city: true,
          highSchool: true,
          year: true,
          level: true,
          xp: true,
          dailyStreak: true,
          interests: true,
          createdAt: true,
          university: { select: { name: true } },
          faculty: { select: { name: true } },
          department: { select: { name: true } },
        },
      }),
      db.post.findMany({
        where: { authorId: me.id },
        select: { text: true, type: true, createdAt: true, isAnonymous: true },
      }),
      db.comment.findMany({
        where: { authorId: me.id },
        select: { text: true, createdAt: true },
      }),
      db.material.findMany({
        where: { uploaderId: me.id },
        select: { title: true, type: true, createdAt: true, downloads: true },
      }),
      db.answer.findMany({
        where: { authorId: me.id },
        select: { text: true, createdAt: true, votes: true },
      }),
      db.question.findMany({
        where: { authorId: me.id },
        select: { title: true, text: true, createdAt: true },
      }),
      db.bookmark.findMany({
        where: { userId: me.id },
        select: { targetType: true, targetId: true, createdAt: true },
      }),
      db.follow.findMany({
        where: { followerId: me.id },
        select: { following: { select: { username: true } }, createdAt: true },
      }),
      db.rsvp.findMany({
        where: { userId: me.id },
        select: { status: true, event: { select: { title: true, date: true } } },
      }),
    ]);

  const payload = {
    eksportuarMe: new Date().toISOString(),
    profili: user ? { ...user, interests: parseList(user.interests) } : null,
    postimet: posts,
    komentet: comments,
    materialet: materials,
    pergjigjet: answers,
    pyetjet: questions,
    ruajtjet: bookmarks,
    ndjekjet: follows.map((item) => ({
      perdoruesi: item.following.username,
      data: item.createdAt,
    })),
    eventet: events,
  };

  return { ...succeed("Eksporti u përgatit."), payload: JSON.stringify(payload, null, 2) };
}

/**
 * Fshirja e llogarisë. Përmbajtja e lidhur bie me cascade, prandaj nuk mbetet
 * gjurmë personale. Kryhet menjëherë, brenda afatit ligjor prej 30 ditësh.
 */
export async function deleteMyAccount(confirmation: string): Promise<ActionState> {
  const me = await requireUser();
  if (confirmation.trim().toLowerCase() !== "fshije") {
    return fail("Shkruaj fjalën «fshije» për ta konfirmuar.");
  }

  await db.user.delete({ where: { id: me.id } });
  await signOut({ redirect: false });
  redirect("/");
}
