import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth, isDemoMode } from "@/lib/auth";
import { DEMO_PRO_COOKIE } from "@/lib/constants";
import { db, parseList } from "@/lib/db";
import { isPro, proExpiresAt, type AccessUser } from "@/lib/access";
import { can, type Actor } from "@/lib/permissions";

/**
 * Përdoruesi aktual, i ngarkuar një herë për kërkesë.
 *
 * Përfshin gjithçka që i duhet shtresës së qasjes: abonimet aktive, ditët e
 * fituara dhe regjistrimet në lëndë. Kështu `isPro()` dhe filtrat e materialeve
 * nuk bëjnë kurrë query të dytë.
 */
const loadCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      avatar: true,
      gender: true,
      bio: true,
      universityId: true,
      facultyId: true,
      departmentId: true,
      year: true,
      level: true,
      city: true,
      highSchool: true,
      isVerified: true,
      // A e ka provuar se e mban vërtet atë email. Pa këtë, llogaria nuk hyn.
      emailVerified: true,
      verification: true,
      // Llogaria e re vetëm shikon derisa admini ta miratojë ID-në.
      awaitingReview: true,
      studentEmail: true,
      birthDate: true,
      firstName: true,
      passwordHash: true,
      role: true,
      locale: true,
      interests: true,
      xpContribution: true,
      xpActivity: true,
      dailyStreak: true,
      streakFreeze: true,
      lastStreakAt: true,
      proDaysEarned: true,
      proEarnedUntil: true,
      showReadReceipts: true,
      cover: true,
      showOnlineStatus: true,
      isPrivate: true,
      // Cilësimet e Pro-s: pamja, dukshmëria dhe kufijtë e kontaktit.
      proAccent: true,
      proCoverStyle: true,
      featuredUntil: true,
      pinnedPostId: true,
      whoCanFollow: true,
      whoCanMessage: true,
      autoAcceptFollows: true,
      campusId: true,
      studyProgramId: true,
      specializationId: true,
      cohortYear: true,
      showLastActive: true,
      lastSeenAt: true,
      pushEnabled: true,
      emailDigest: true,
      analyticsConsent: true,
      demoLabel: true,
      createdAt: true,
      onboardedAt: true,
      university: { select: { id: true, name: true, nameEn: true, abbr: true } },
      faculty: { select: { id: true, name: true, nameEn: true, abbr: true, color: true } },
      // Programi i duhet personalizimit: punët, sugjerimet dhe profili.
      studyProgram: { select: { id: true, name: true, nameEn: true, degreeTitle: true } },
      department: { select: { id: true, name: true, nameEn: true } },
      subscriptions: {
        where: { status: "active" },
        select: { status: true, expiresAt: true, source: true },
      },
      enrollments: { select: { courseId: true } },
    },
  });
  if (!user) return null;

  const access: AccessUser = {
    id: user.id,
    role: user.role,
    universityId: user.universityId,
    facultyId: user.facultyId,
    proEarnedUntil: user.proEarnedUntil,
    subscriptions: user.subscriptions,
    enrollments: user.enrollments,
  };

  // Vetëm në modalitetin demo: çelësi «Shfaq si falas / Pro» e mbivendos gjendjen
  // pa e prekur bazën, që të dyja pamjet të krahasohen brenda sekondash.
  let proOverride: "free" | "pro" | null = null;
  if (isDemoMode && user.demoLabel) {
    const jar = await cookies();
    const raw = jar.get(DEMO_PRO_COOKIE)?.value;
    if (raw === "free" || raw === "pro") proOverride = raw;
  }

  if (proOverride === "pro") {
    access.role = user.role === "admin" ? user.role : access.role;
    access.proEarnedUntil = new Date(Date.now() + 86_400_000);
  } else if (proOverride === "free") {
    access.proEarnedUntil = null;
    access.subscriptions = [];
    if (access.role === "admin") access.role = "student";
  }

  // Aktori i shtreses se lejeve ndërtohet një here, këtu, dhe udheton i gatshem.
  // Asnje faqe nuk e rindertoj vetë, sepse ndryshe do te kishim dy perkufizime.
  const actor: Actor = {
    ...access,
    role: access.role,
    verification: (user.verification as Actor["verification"]) ?? "unverified",
    awaitingReview: user.awaitingReview,
    accountAgeDays: Math.floor((Date.now() - user.createdAt.getTime()) / 86_400_000),
  };

  // Hash-i i password-it nuk del nga ky modul: mjafton të dihet nëse ekziston.
  const { passwordHash, ...safe } = user;

  return {
    ...safe,
    hasPassword: Boolean(passwordHash),
    access,
    actor,
    proOverride,
    interestList: parseList(user.interests),
    pro: isPro(access),
    proUntil: proExpiresAt(access),
    courseIds: user.enrollments.map((item) => item.courseId),
  };
});

export const getCurrentUser = loadCurrentUser;
export type CurrentUser = NonNullable<Awaited<ReturnType<typeof loadCurrentUser>>>;

/**
 * Për faqet brenda aplikacionit.
 *
 * Rendi i rojeve është edhe rendi i hapave të studentit: sesioni, pastaj emaili
 * i provuar, pastaj profili. Emaili vjen para profilit sepse pa të nuk dimë as
 * kush është ai që po e plotëson.
 */
export async function requireUser() {
  const user = await loadCurrentUser();
  if (!user) redirect("/hyr");
  if (!user.onboardedAt) redirect("/regjistrohu");
  return user;
}

/**
 * Për çdo veprim që shkruan diçka para të tjerëve: postim, koment, pëlqim,
 * storje, mesazh, ndjekje, ngarkim, aplikim, zë në dhomë.
 *
 * Llogaria që pret miratimin e ID-së vetëm shikon. Ridrejtimi e çon te faqja e
 * verifikimit, ku sheh pse dhe sa ka mbetur; ndërfaqja i fsheh këto butona
 * paraprakisht, kjo është roja e serverit.
 */
export async function requireParticipant() {
  const user = await requireUser();
  if (!can(user.actor, "participate").allowed) redirect("/verifikimi?shqyrtim=1");
  return user;
}

/** Si `requireParticipant`, për veprimet që thirren gjatë hyrjes (p.sh. ndjekjet). */
export async function requireParticipantAccount() {
  const user = await requireAccount();
  if (!can(user.actor, "participate").allowed) redirect("/verifikimi?shqyrtim=1");
  return user;
}

/** Për onboarding-un: kërkon sesion dhe email të provuar, jo profil të plotë. */
export async function requireAccount() {
  const user = await loadCurrentUser();
  if (!user) redirect("/hyr");
  return user;
}

/** Vetëm sesioni. E përdor faqja e konfirmimit, e cila rri para të gjitha rojeve. */
export async function requireSession() {
  const user = await loadCurrentUser();
  if (!user) redirect("/hyr");
  return user;
}

export async function requireModerator() {
  const user = await requireUser();
  if (user.role !== "moderator" && user.role !== "admin") redirect("/feed");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/feed");
  return user;
}
