"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { isDemoMode, signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkBirthDate } from "@/lib/age";
import { canContinue } from "@/lib/password-rules";
import { issueStudentCode } from "@/lib/registration";
import { isStudentEmail, upcomingInstitutionFor } from "@/lib/student-domains";
import { looksLikeStudentId, validateFullName } from "@/lib/identity";
import { rateLimit, rateLimitKey } from "@/lib/rate-limit";
import { createWithUniqueUsername } from "@/lib/queries/username";
import { usernameBase } from "@/lib/username";
import { fail, type ActionState } from "./types";

const registerSchema = z.object({
  firstName: z.string().trim().min(2, "errorFirstName").max(30, "errorFirstName"),
  lastName: z.string().trim().min(2, "errorLastName").max(30, "errorLastName"),
  birthDate: z.string().trim().min(1, "errorBirthInvalid"),
  email: z.string().trim().toLowerCase().email("errorEmail"),
  password: z.string().max(72, "errorPassword"),
  confirm: z.string(),
  terms: z.literal("on", { message: "errorTerms" }),
  inviteCode: z.string().trim().optional(),
});

/**
 * Hyrja pranon email ose emër përdoruesi te e njëjta fushë.
 *
 * Prandaj këtu nuk kërkohet format emaili: kontrolli i vërtetë bëhet te
 * `lib/auth.ts`, ku shihet nëse vargu ka @ dhe kërkohet aty ku duhet.
 */
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(3, "errorEmail").max(120, "errorEmail"),
  password: z.string().min(1, "errorPassword"),
});

async function clientKey() {
  const headerList = await headers();
  return (
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    "anonim"
  );
}

/**
 * Regjistrimi me email studentor.
 *
 * Emri, mbiemri, data e lindjes (nga 16 vjeç), emaili studentor dhe password-i.
 * Llogaria hapet, por emaili provohet me kod para çdo hapi tjetër, dhe pastaj
 * vjen fotoja e ID-së. Deri sa admini ta miratojë, llogaria vetëm shikon.
 */
export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    birthDate: formData.get("birthDate"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
    terms: formData.get("terms"),
    inviteCode: formData.get("inviteCode") ?? undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return fail("auth.errorForm", fieldErrors);
  }

  const { email, password, confirm, inviteCode } = parsed.data;

  // Emri kontrollohet si një i tërë, me të njëjtat rregulla si kudo tjetër.
  const named = validateFullName(`${parsed.data.firstName} ${parsed.data.lastName}`);
  if (!named.ok) return fail("auth.errorForm", { firstName: named.reason });

  const birth = checkBirthDate(parsed.data.birthDate);
  if (!birth.ok) return fail("auth.errorForm", { birthDate: birth.reason });

  // Vetëm email studentor: kodi provon që e mban, ID-ja që është student.
  if (!isStudentEmail(email)) {
    const upcoming = upcomingInstitutionFor(email);
    return upcoming
      ? fail("auth.errorForm", { email: "errorEmailUpcoming" }, { institution: upcoming.name })
      : fail("auth.errorForm", { email: "errorEmailNotStudent" });
  }

  if (!canContinue(password, confirm)) return fail("auth.errorForm", { password: "errorPasswordRules" });

  if (await db.user.findFirst({ where: { OR: [{ email }, { studentEmail: email }] }, select: { id: true } })) {
    return fail("auth.errorEmailTaken", { email: "errorEmailTakenHint" });
  }

  /*
    Kufiri numërohet vetëm te një regjistrim i vërtetë.

    Dikur numërohej te çdo dërgim i formularit, prandaj pesë gabime shkrimi e
    mbyllnin regjistrimin për një orë. Tani kur bie kufiri, mesazhi e thotë edhe
    sa duhet pritur, që studenti të mos hamendësojë.
  */
  const limit = rateLimit("register", rateLimitKey(await clientKey()));
  if (!limit.ok) {
    return fail("errors.rateLimitedMinutes", undefined, {
      minutes: Math.max(1, limit.retryAfterMinutes),
    });
  }

  const { firstName, lastName } = named;
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();

  /*
    Emri i përdoruesit del nga emri, jo nga adresa.

    Një email studentor si `pc12345@student.uni-pr.edu` do të jepte emrin
    «pc12345», të pakuptueshëm për këdo. Adresa përdoret vetëm kur emri nuk jep
    dot asgjë të lexueshme. Krijimi e rezervon: dy regjistrime në të njëjtin
    çast nuk marrin dot të njëjtin emër, sepse baza e refuzon të dytin.
  */
  const user = await createWithUniqueUsername(
    usernameBase(firstName, lastName, looksLikeStudentId(email) ? undefined : email),
    (username) =>
      db.user.create({
        data: {
          email,
          username,
          name: `${firstName} ${lastName}`.trim(),
          firstName,
          lastName: lastName || null,
          birthDate: birth.date,
          passwordHash,
          isVerified: false,
          // Emaili provohet me kod te hapi tjetër, ID-ja pas tij.
          emailVerified: null,
          awaitingReview: true,
          termsAcceptedAt: now,
          ageConfirmedAt: now,
        },
      }),
  );

  await db.invite.create({
    data: {
      inviterId: user.id,
      code: `${user.username.split(".")[0].slice(0, 4).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`,
    },
  });

  // Ftesa lidh dy njerëz menjëherë. XP-ja e ftuesit jepet vetëm pas shtatë
  // ditësh aktiviteti, prandaj këtu shënohet vetëm përdorimi.
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
        // Ftesa i lidh të dy menjëherë: kërkesa këtu nuk ka kujt t'i shkojë.
        data: [
          { followerId: user.id, followingId: invite.inviterId, isMutual: true, status: "accepted" },
          { followerId: invite.inviterId, followingId: user.id, isMutual: true, status: "accepted" },
        ],
      });
      await db.notification.create({
        data: {
          userId: invite.inviterId,
          category: "social",
          type: "invite_used",
          actorId: user.id,
          payload: JSON.stringify({}),
        },
      });
    }
  }

  // Kodi niset menjëherë: faqja tjetër është ajo ku shkruhet.
  await issueStudentCode({ id: user.id, firstName, name: user.name }, email);

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) return fail("auth.errorSignIn");
    throw error;
  }

  redirect("/regjistrohu");
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fail("auth.errorForm");

  /*
    Llogaria e hapur me Google, që ende s'e ka vendosur password-in e platformës,
    nuk ka çfarë të krahasojë. Në vend të «password i pasaktë», i thuhet hapur
    rruga: «Vazhdo me Google», ku vendoset edhe password-i.
  */
  const identifier = parsed.data.email;
  const account = await db.user.findFirst({
    where: identifier.includes("@") ? { email: identifier } : { username: identifier },
    select: { passwordHash: true, accounts: { where: { provider: "google" }, select: { id: true }, take: 1 } },
  });
  if (account && !account.passwordHash && account.accounts.length > 0) return fail("authFlow.googleOnly");

  try {
    await signIn("credentials", { ...parsed.data, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) return fail("auth.errorCredentials");
    throw error;
  }

  // Ridrejtimi behet ne server, jo me një efekt te klientit. Efekti e linte
  // studentin te faqja e hyrjes me fushat e zbrazura dhe pa asnje shpjegim.
  redirect("/feed");
}

/** Hyrje me një klikim si llogari demo. Punon vetëm kur DEMO_MODE është i ndezur. */
export async function demoSignIn(userId: string) {
  if (!isDemoMode) redirect("/hyr");

  const user = await db.user.findFirst({
    where: { id: userId, demoLabel: { not: null } },
    select: { onboardedAt: true },
  });
  if (!user) redirect("/demo");

  await signIn("demo", { userId, redirect: false });
  redirect(user.onboardedAt ? "/feed" : "/regjistrohu");
}

export async function googleSignInAction() {
  // Pas Google-it studenti vendos password-in e platformës, pastaj vazhdon onboarding-u.
  await signIn("google", { redirectTo: "/regjistrohu/llogaria" });
}

export async function signOutAction() {
  await signOut({ redirect: false });
  redirect("/");
}
