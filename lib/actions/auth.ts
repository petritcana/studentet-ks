"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { isInstitutionalEmail, MIN_AGE } from "@/lib/constants";
import { rateLimit, rateLimitMessage } from "@/lib/rate-limit";
import { awardXp } from "@/lib/xp";
import { fail, succeed, type ActionState } from "./types";

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Shkruaj emrin dhe mbiemrin.")
    .max(60, "Emri është shumë i gjatë."),
  email: z.string().trim().toLowerCase().email("Ky email s'duket i saktë."),
  password: z
    .string()
    .min(8, "Fjalëkalimi duhet të ketë të paktën 8 shkronja.")
    .max(72, "Fjalëkalimi është shumë i gjatë."),
  ageConfirmed: z.literal("on", {
    message: `Platforma është për ${MIN_AGE} vjeç e lart.`,
  }),
  inviteCode: z.string().trim().optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ky email s'duket i saktë."),
  password: z.string().min(1, "Shkruaj fjalëkalimin."),
});

async function clientKey() {
  const headerList = await headers();
  return (
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    "anonim"
  );
}

function usernameFrom(name: string, email: string) {
  const base = `${name}`
    .toLowerCase()
    .replace(/ë/g, "e")
    .replace(/ç/g, "c")
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9.]/g, "");
  return base.length >= 3 ? base : email.split("@")[0].replace(/[^a-z0-9.]/g, "");
}

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const limit = rateLimit("register", await clientKey());
  if (!limit.ok) return fail(rateLimitMessage(limit));

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    ageConfirmed: formData.get("ageConfirmed"),
    inviteCode: formData.get("inviteCode") ?? undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return fail("Diçka s'është plotësuar si duhet.", fieldErrors);
  }

  const { name, email, password, inviteCode } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return fail("Ky email është i regjistruar tashmë.", {
      email: "Provo të hysh me këtë email ose përdor një tjetër.",
    });
  }

  let username = usernameFrom(name, email);
  let attempt = 1;
  while (await db.user.findUnique({ where: { username } })) {
    attempt += 1;
    username = `${usernameFrom(name, email)}${attempt}`;
  }

  const verified = isInstitutionalEmail(email);

  const user = await db.user.create({
    data: {
      email,
      username,
      name,
      passwordHash: await bcrypt.hash(password, 10),
      isVerified: verified,
      emailVerified: verified ? new Date() : null,
    },
  });

  await db.invite.create({
    data: {
      inviterId: user.id,
      code: `${username.split(".")[0].slice(0, 4).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`,
    },
  });

  if (verified) {
    const badge = await db.badge.findUnique({ where: { code: "verified" } });
    if (badge) {
      await db.userBadge.create({ data: { userId: user.id, badgeId: badge.id } });
    }
  }

  // Ftesa virale: të dy fitojnë dhe lidhen automatikisht si shokë.
  const code = inviteCode?.trim().toUpperCase();
  if (code) {
    const invite = await db.invite.findUnique({
      where: { code },
      select: { id: true, inviterId: true, usedAt: true },
    });
    if (invite && !invite.usedAt && invite.inviterId !== user.id) {
      await db.invite.update({
        where: { id: invite.id },
        data: { invitedUserId: user.id, usedAt: new Date() },
      });
      await db.follow.createMany({
        data: [
          { followerId: user.id, followingId: invite.inviterId, isMutual: true },
          { followerId: invite.inviterId, followingId: user.id, isMutual: true },
        ],
      });
      await awardXp(invite.inviterId, "successfulInvite");
      await db.notification.create({
        data: {
          userId: invite.inviterId,
          type: "mutual",
          actorId: user.id,
          text: "u regjistrua me ftesën tënde",
          context: "U bëtë shokë automatikisht. +100 XP",
        },
      });
    }
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return fail("Llogaria u krijua, por hyrja dështoi. Provo të hysh manualisht.");
    }
    throw error;
  }

  const jar = await cookies();
  jar.delete("invite_code");
  return succeed("Llogaria u krijua.");
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0] ?? "form")] = issue.message;
    }
    return fail("Plotëso të dyja fushat.", fieldErrors);
  }

  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return fail("Email-i ose fjalëkalimi s'përputhen. Provo prapë.");
    }
    throw error;
  }

  return succeed();
}

export async function googleSignInAction() {
  await signIn("google", { redirectTo: "/regjistrohu" });
}

export async function signOutAction() {
  await signOut({ redirect: false });
  redirect("/");
}

