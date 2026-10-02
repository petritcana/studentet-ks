import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PersonCard } from "@/components/social/person-card";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import type { SuggestedPerson } from "@/lib/suggestions";
import { acceptedFollow } from "@/lib/follow";

/** Lista e ndjekësve, e atyre që ndjek, ose e shokëve (ndjekje e dyanshme). */
export async function FollowList({
  username,
  kind,
}: {
  username: string;
  kind: "followers" | "following" | "friends";
}) {
  const [me, locale, t] = await Promise.all([
    requireUser(),
    getLocale(),
    getTranslations("profile"),
  ]);
  const english = locale === "en";

  const owner = await db.user.findUnique({
    where: { username },
    select: { id: true, name: true },
  });
  if (!owner) notFound();

  // Dy query të ndara në vend të një `select` me kusht: kushti brenda `select`
  // e humb tipin dhe e bën rezultatin të papërdorshëm.
  const people =
    kind === "followers"
      ? (
          await db.follow.findMany({
            where: { followingId: owner.id, ...acceptedFollow },
            orderBy: { createdAt: "desc" },
            take: 100,
            select: { follower: PERSON_SELECT },
          })
        ).map((row) => row.follower)
      : (
          await db.follow.findMany({
            where: { followerId: owner.id, ...acceptedFollow, ...(kind === "friends" ? { isMutual: true } : {}) },
            orderBy: { createdAt: "desc" },
            take: 100,
            select: { following: PERSON_SELECT },
          })
        ).map((row) => row.following);

  // Kush nga këta e ndjek tashmë shikuesi: butoni duhet ta dijë gjendjen e vet.
  const mine = await db.follow.findMany({
    where: { followerId: me.id, ...acceptedFollow, followingId: { in: people.map((person) => person.id) } },
    select: { followingId: true },
  });
  const followedByMe = new Set(mine.map((row) => row.followingId));

  const cards: SuggestedPerson[] = people.map((person) => ({
    id: person.id,
    name: person.name,
    username: person.username,
    avatar: person.avatar,
    bio: person.bio,
    isVerified: person.isVerified,
    isPro: false,
    universityAbbr: person.university?.abbr ?? null,
    year: person.year,
    facultyCode: person.faculty?.color ?? null,
    facultyLabel: person.faculty ? (english ? person.faculty.nameEn : person.faculty.name) : null,
    score: 0,
    reasons: [],
  }));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <header className="flex items-center gap-2">
        <Link
          href={`/u/${username}`}
          aria-label={owner.name}
          className="grid size-8 shrink-0 place-items-center rounded-full text-text-muted transition-colors duration-150 hover:bg-surface hover:text-text"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-text">
          {t(kind)}
        </h1>
      </header>

      {cards.length === 0 ? (
        <EmptyState
          illustration="people"
          compact
          title={t(kind === "followers" ? "noFollowers" : kind === "friends" ? "noFriends" : "noFollowing")}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {cards.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              following={followedByMe.has(person.id)}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}

const PERSON_SELECT = {
  select: {
    id: true,
    name: true,
    username: true,
    avatar: true,
    bio: true,
    isVerified: true,
    year: true,
    university: { select: { abbr: true } },
    faculty: { select: { name: true, nameEn: true, color: true } },
  },
} as const;
