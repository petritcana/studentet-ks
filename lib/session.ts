import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db, parseList } from "@/lib/db";

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof loadCurrentUser>>>;

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
      bio: true,
      universityId: true,
      facultyId: true,
      departmentId: true,
      year: true,
      level: true,
      city: true,
      highSchool: true,
      isVerified: true,
      xp: true,
      dailyStreak: true,
      streakFreeze: true,
      lastStreakAt: true,
      role: true,
      interests: true,
      createdAt: true,
      onboardedAt: true,
      showReadReceipts: true,
      pushEnabled: true,
      analyticsConsent: true,
      faculty: { select: { id: true, name: true, color: true } },
      department: { select: { id: true, name: true } },
      university: { select: { id: true, name: true, abbr: true } },
    },
  });
  if (!user) return null;

  return { ...user, interestList: parseList(user.interests) };
});

export const getCurrentUser = loadCurrentUser;

/** Për faqet brenda aplikacionit: pa sesion s'ka çfarë të shfaqet. */
export async function requireUser() {
  const user = await loadCurrentUser();
  if (!user) redirect("/hyr");
  if (!user.onboardedAt) redirect("/regjistrohu");
  return user;
}

/** Për faqet e onboarding-ut: kërkon sesion, por jo profil të përfunduar. */
export async function requireAccount() {
  const user = await loadCurrentUser();
  if (!user) redirect("/hyr");
  return user;
}

export async function requireModerator() {
  const user = await requireUser();
  if (user.role !== "moderator" && user.role !== "admin") redirect("/feed");
  return user;
}
