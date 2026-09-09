import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Bookmark,
  Flame,
  MapPin,
  School,
  Sparkles,
  Trophy,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { FollowButton, type FollowState } from "@/components/social/follow-button";
import { MutualContext } from "@/components/social/mutual-context";
import { MessageButton } from "@/components/social/message-button";
import { PostCard } from "@/components/feed/post-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { db, parseList } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getMutualContext } from "@/lib/suggestions";
import { getProfilePosts } from "@/lib/queries/profile";
import { facultyTheme } from "@/lib/faculties";
import { levelFor } from "@/lib/xp";
import { MATERIAL_TYPE_LABELS, YEAR_LABELS, type MaterialType } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { cn, formatNumber } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const user = await db.user.findUnique({
    where: { username },
    select: { name: true, bio: true },
  });
  return { title: user?.name ?? "Profili", description: user?.bio ?? undefined };
}

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const viewer = await requireUser();

  const profile = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      avatar: true,
      bio: true,
      city: true,
      highSchool: true,
      year: true,
      xp: true,
      dailyStreak: true,
      isVerified: true,
      createdAt: true,
      interests: true,
      faculty: { select: { name: true, color: true } },
      badges: {
        select: {
          context: true,
          badge: { select: { code: true, name: true, description: true } },
        },
        orderBy: { earnedAt: "desc" },
      },
      _count: { select: { materials: true, posts: true } },
    },
  });

  if (!profile) notFound();
  const isMe = profile.id === viewer.id;

  const [follow, reverseFollow, mutualContext, posts, materials, acceptedAnswers, invite] =
    await Promise.all([
      isMe
        ? null
        : db.follow.findUnique({
            where: {
              followerId_followingId: { followerId: viewer.id, followingId: profile.id },
            },
            select: { isMutual: true },
          }),
      isMe
        ? null
        : db.follow.findUnique({
            where: {
              followerId_followingId: { followerId: profile.id, followingId: viewer.id },
            },
            select: { id: true },
          }),
      isMe ? Promise.resolve([]) : getMutualContext(viewer.id, profile.id),
      getProfilePosts(profile.id, viewer.id),
      db.material.findMany({
        where: { uploaderId: profile.id, isHidden: false },
        select: {
          id: true,
          title: true,
          type: true,
          verificationStatus: true,
          course: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      db.answer.count({
        where: { authorId: profile.id, question: { acceptedAnswerId: { not: null } } },
      }),
      isMe
        ? db.invite.findFirst({
            where: { inviterId: profile.id, usedAt: null },
            select: { code: true },
          })
        : Promise.resolve(null),
    ]);

  const followState: FollowState = follow ? (follow.isMutual ? "mutual" : "following") : "none";
  const theme = facultyTheme(profile.faculty?.color);
  const level = levelFor(profile.xp);
  const interests = parseList(profile.interests);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={isMe ? "Profili im" : profile.name} back="/kampusi" />

      <Card className="overflow-hidden">
        <div className={cn("h-20 bg-linear-to-br", theme.gradient)} aria-hidden />
        <div className="-mt-10 flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <span className="rounded-full ring-4 ring-surface">
              <Avatar
                name={profile.name}
                src={profile.avatar}
                size="xl"
                verified={profile.isVerified}
              />
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {isMe ? (
                <Link
                  href="/cilesimet"
                  className="rounded-full border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-2"
                >
                  Ndrysho profilin
                </Link>
              ) : (
                <>
                  <MessageButton targetId={profile.id} disabled={followState !== "mutual"} />
                  <FollowButton targetId={profile.id} initialState={followState} size="pill" />
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-text">{profile.name}</h2>
              {profile.isVerified ? (
                <Badge variant="success">
                  <BadgeCheck />I verifikuar
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-text-muted">@{profile.username}</p>

            {reverseFollow && followState === "none" ? (
              <Badge variant="brand" className="w-fit">
                Të ndjek ty
              </Badge>
            ) : null}

            {profile.bio ? <p className="measure text-sm text-text">{profile.bio}</p> : null}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-muted">
              {profile.faculty ? (
                <span className={cn("inline-flex items-center gap-1.5", theme.text)}>
                  <span className={cn("size-2 rounded-full", theme.dot)} aria-hidden />
                  {theme.shortLabel}
                  {profile.year ? `, ${YEAR_LABELS[profile.year]?.toLowerCase()}` : ""}
                </span>
              ) : null}
              {profile.city ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3" />
                  {profile.city}
                </span>
              ) : null}
              {profile.highSchool ? (
                <span className="inline-flex items-center gap-1.5">
                  <School className="size-3" />
                  {profile.highSchool}
                </span>
              ) : null}
              <span>Anëtar që nga {formatDate(profile.createdAt)}</span>
            </div>

            {mutualContext.length > 0 ? <MutualContext reasons={mutualContext} max={3} /> : null}

            {interests.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {interests.map((interest) => (
                  <Badge key={interest}>{interest}</Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Sparkles} value={formatNumber(profile._count.materials)} label="materiale" />
        <StatCard
          icon={Trophy}
          value={formatNumber(acceptedAnswers)}
          label="përgjigje të pranuara"
        />
        <StatCard icon={Bookmark} value={formatNumber(profile._count.posts)} label="postime" />
        <StatCard icon={Flame} value={formatNumber(profile.dailyStreak)} label="ditë rresht" />
      </div>

      <Card className="p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-text">{level.name}</p>
          <span className="tabular text-xs text-text-muted">{formatNumber(profile.xp)} XP</span>
        </div>
        <p className="mt-0.5 text-xs text-text-muted">{level.description}</p>
        <Progress value={level.percent} className="mt-3" />
        {level.next ? (
          <p className="mt-2 text-xs text-text-muted">
            Edhe {formatNumber(level.toNext)} XP deri te {level.next}.
          </p>
        ) : null}
      </Card>

      {profile.badges.length > 0 ? (
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-text">Badge-t</h2>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {profile.badges.map((item) => (
              <div
                key={`${item.badge.code}-${item.context ?? ""}`}
                className="flex items-start gap-3 rounded-md border border-border bg-surface-2 p-3"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-500/12 text-brand-500">
                  <BadgeCheck className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-text">
                    {item.badge.name}
                    {item.context ? `: ${item.context}` : ""}
                  </span>
                  <span className="block text-xs text-text-muted">{item.badge.description}</span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {isMe && invite ? (
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-text">Linku yt i ftesës</h2>
          <p className="mt-1 text-xs text-text-muted">
            Kur dikush regjistrohet me këtë link, bëheni shokë automatikisht dhe të dy merrni XP.
          </p>
          <code className="mt-3 block truncate rounded-sm border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-text">
            /ftesa/{invite.code}
          </code>
        </Card>
      ) : null}

      {materials.length > 0 ? (
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-text">Materialet e ngarkuara</h2>
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {materials.map((material) => (
              <li key={material.id}>
                <Link
                  href={`/materialet/${material.id}`}
                  className="flex items-center gap-3 py-3 first:pt-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text">{material.title}</p>
                    <p className="truncate text-xs text-text-muted">
                      {material.course.name} ·{" "}
                      {MATERIAL_TYPE_LABELS[material.type as MaterialType] ?? material.type}
                    </p>
                  </div>
                  {material.verificationStatus === "verified" ? (
                    <Badge variant="success">I verifikuar</Badge>
                  ) : (
                    <Badge variant="warning">Pa verifikuar</Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">Postimet</h2>
        {posts.length === 0 ? (
          <EmptyState
            illustration="feed"
            compact
            title={isMe ? "Ende s'ke postuar asgjë" : "Ende s'ka postuar asgjë"}
            description={
              isMe
                ? "Nis me diçka të vogël: një njoftim, një pyetje, ose shënimet e javës."
                : "Kur të postojë, do ta shohësh këtu."
            }
          />
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Flame;
  value: string;
  label: string;
}) {
  return (
    <Card className="flex flex-col gap-1 p-3">
      <Icon className="size-4 text-brand-500" />
      <span className="tabular text-lg font-semibold text-text">{value}</span>
      <span className="text-xs text-text-muted">{label}</span>
    </Card>
  );
}
