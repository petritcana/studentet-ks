import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileContent, profileTabFrom } from "@/components/profile/profile-content";
import { StoryHighlights } from "@/components/profile/story-highlights";
import { XpSummary } from "@/components/profile/xp-summary";
import { formatDate } from "@/lib/format";
import { getHighlights, getStoryArchive } from "@/lib/queries/highlights";
import { getProfile } from "@/lib/queries/profile";
import { hasActiveStory } from "@/lib/queries/stories";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  return { title: t("title") };
}

export const dynamic = "force-dynamic";

/**
 * Profili im.
 *
 * Rendi: koka (me veprimet si ikona dhe badge-t), dosjet e storjeve, përmbledhja
 * e ngjeshur e XP-së, pastaj skedat Postime, Riposte, Të ruajtura, Materiale.
 */
export default async function MyProfilePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [me, locale, params] = await Promise.all([requireUser(), getLocale(), searchParams]);

  const [profile, t, highlights, archive, storyRing] = await Promise.all([
    getProfile(me.username, locale),
    getTranslations("profile"),
    getHighlights(me.id),
    getStoryArchive(me.id),
    hasActiveStory(me.id),
  ]);

  if (!profile) return null;

  const proDays = me.proUntil ? Math.max(0, Math.ceil((me.proUntil.getTime() - Date.now()) / 86_400_000)) : 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5" data-profile-theme={profile.header.profileTheme ?? undefined}>
      <ProfileHeader
        user={profile.header}
        isMe
        following={false}
        requested={false}
        isFriend={false}
        context={[]}
        presence={null}
        hasStory={storyRing}
        badges={profile.badges}
      />

      <StoryHighlights
        owner={{ id: me.id, name: me.name, username: me.username, avatar: me.avatar, facultyCode: profile.header.facultyCode }}
        highlights={highlights}
        isMe
        archive={archive}
        viewerId={me.id}
      />

      <XpSummary xpContribution={me.xpContribution} xpActivity={me.xpActivity} streak={me.dailyStreak} proDays={proDays} />

      <ProfileContent viewer={me} ownerId={me.id} isMe tab={profileTabFrom(params.tab, true)} base="/une" locale={locale} />

      <p className="text-xs text-text-muted">
        {t("memberSince", { date: formatDate(profile.stats.memberSince, locale) })}
      </p>
    </div>
  );
}
