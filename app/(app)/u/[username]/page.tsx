import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { formatDate, formatTime, timeAgo } from "@/lib/format";
import { db } from "@/lib/db";
import { ProfileHeader } from "@/components/profile/profile-header";
import { PageWithRail } from "@/components/layout/page-with-rail";
import { ProfileRail } from "@/components/profile/profile-rail";
import { countMutualFollowers, getProfile, getRelationship } from "@/lib/queries/profile";
import { getHighlights, getStoryArchive } from "@/lib/queries/highlights";
import { ProfileContent, profileTabFrom } from "@/components/profile/profile-content";
import { StoryHighlights } from "@/components/profile/story-highlights";
import { canViewProfileContent } from "@/lib/follow";
import { Card } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { getPresence } from "@/lib/queries/presence";
import { hasActiveStory } from "@/lib/queries/stories";
import { requireUser } from "@/lib/session";
import { getMutualContext } from "@/lib/suggestions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const locale = await getLocale();
  const profile = await getProfile(username, locale);
  return { title: profile?.header.name ?? username };
}

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ username }, query, me, locale] = await Promise.all([
    params,
    searchParams,
    requireUser(),
    getLocale(),
  ]);

  const profile = await getProfile(username, locale);
  if (!profile) notFound();

  const isMe = profile.header.id === me.id;

  const relationship = await getRelationship(me.id, profile.header.id);

  const [context, presence, mutuals, storyRing, tPresence] = await Promise.all([
    isMe ? Promise.resolve([]) : getMutualContext(me.id, profile.header.id, locale),
    // Statusi shfaqet vetëm te njerëzit që i ndjek. Profili im nuk e shfaq: e di vetë që jam këtu.
    isMe || !relationship.following ? Promise.resolve(null) : getPresence(profile.header.id),
    isMe ? Promise.resolve(0) : countMutualFollowers(me.id, profile.header.id),
    hasActiveStory(profile.header.id),
    getTranslations("presence"),
  ]);

  // Adminët shohin «Jep Pro» te profili i të tjerëve; data formatohet këtu, në server.
  const adminPro =
    me.role === "admin" && !isMe
      ? await db.user
          .findUnique({ where: { id: profile.header.id }, select: { proEarnedUntil: true } })
          .then((row) => ({
            proUntilLabel:
              row?.proEarnedUntil && row.proEarnedUntil > new Date()
                ? `${formatDate(row.proEarnedUntil, locale)}, ${formatTime(row.proEarnedUntil)}`
                : null,
          }))
      : null;

  const [ts, highlights, archive] = await Promise.all([
    getTranslations("social"),
    getHighlights(profile.header.id),
    isMe ? getStoryArchive(me.id) : Promise.resolve([]),
  ]);

  // Profili privat i tregon vetëm identitetin dhe numrat derisa kërkesa pranohet.
  const canSeeContent = canViewProfileContent({
    viewerId: me.id,
    ownerId: profile.header.id,
    ownerIsPrivate: profile.header.isPrivate,
    viewerFollowState: relationship.state,
  });

  return (
    <PageWithRail rail={canSeeContent ? <ProfileRail profile={profile} isMe={isMe} /> : null}>
      {/* Dizajni i profilit (Pro) vlen vetëm brenda këtij mbështjellësi. */}
      <div className="flex flex-col gap-4" data-profile-theme={profile.header.profileTheme ?? undefined}>
        <ProfileHeader
          user={profile.header}
          isMe={isMe}
          following={relationship.following}
          requested={relationship.requested}
          isFriend={relationship.isFriend}
          context={context}
          mutuals={mutuals}
          hasStory={storyRing}
          badges={profile.badges}
          adminPro={adminPro}
          presence={
            presence
              ? {
                  status: presence.status,
                  lastSeenLabel: presence.lastSeenAt
                    ? tPresence("lastActive", { time: timeAgo(presence.lastSeenAt, locale) })
                    : null,
                }
              : null
          }
        />

        {canSeeContent ? null : (
          <Card className="flex flex-col items-center gap-2 border-dashed p-8 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-surface-2 text-text-muted">
              <Lock className="size-5" />
            </span>
            <p className="text-sm font-semibold text-text">{ts("privateTitle")}</p>
            <p className="measure text-xs text-text-muted">
              {ts("privateBody", { name: profile.header.name })}
            </p>
          </Card>
        )}

        {canSeeContent ? (
          <>
            <StoryHighlights
              owner={{
                id: profile.header.id,
                name: profile.header.name,
                username: profile.header.username,
                avatar: profile.header.avatar,
                facultyCode: profile.header.facultyCode,
              }}
              highlights={highlights}
              isMe={isMe}
              archive={archive}
              viewerId={me.id}
            />
            <ProfileContent
              viewer={me}
              ownerId={profile.header.id}
              isMe={isMe}
              tab={profileTabFrom(query.tab, isMe)}
              base={`/u/${username}`}
              locale={locale}
            />
          </>
        ) : null}
      </div>
    </PageWithRail>
  );
}
