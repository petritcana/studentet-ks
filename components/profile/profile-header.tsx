"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { MessageSquare, Sparkles, Upload } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { ProBadge } from "@/components/identity/pro-badge";
import { VerifiedMark } from "@/components/identity/verified-mark";
import { ReasonLine } from "@/components/social/person-card";
import { ProfileMoreMenu } from "./profile-more-menu";
import { ProfileProButton } from "@/components/admin/profile-pro-button";
import { ProfileBadges, type ProfileBadge } from "./profile-badges";
import { Tooltip } from "@/components/ui/tooltip";
import { PresenceBadge, PresenceDot } from "@/components/social/presence-dot";
import { FollowButton, followStateFrom, type FollowState } from "@/components/social/follow-button";
import { startConversation } from "@/lib/actions/messages";
import { formatNumber } from "@/lib/format";
import type { PresenceStatus } from "@/lib/presence";
import type { ContextReason } from "@/lib/suggestions";
import { coverStyle, proAccentStyle } from "@/lib/pro-appearance";
import type { ProfileTheme } from "@/lib/pro";
import { ProfileDesignDialog } from "./profile-design-dialog";
import { cn } from "@/lib/utils";

export type ProfileHeaderUser = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  isVerified: boolean;
  isPro: boolean;
  universityAbbr: string | null;
  facultyCode: string | null;
  facultyLabel: string | null;
  /** Programi i studimit. Te kolegjet private ky është i vetmi kontekst akademik. */
  programLabel: string | null;
  /** Shkurtesa e titullit: BSc, BA, LLB, MSc. */
  degreeTitle: string | null;
  year: number | null;
  levelKey: string;
  cover: string | null;
  /** Pamja premium: theksi dhe stili i kopertinës, kur studenti ka Pro. */
  proAccent: string | null;
  proCoverStyle: string | null;
  profileTheme: ProfileTheme | null;
  nameColor: string | null;
  role: string;
  isPrivate: boolean;
  followerCount: number;
  followingCount: number;
  friendCount: number;
  postCount: number;
  contributionXp: number;
};

/**
 * Koka e profilit.
 *
 * E mbajtur e ulët me qëllim: postimet janë pjesa kryesore e profilit, prandaj
 * koka tregon kush është personi, numrat dhe dy butona, dhe i lë vend postimeve.
 */
export function ProfileHeader({
  user,
  isMe,
  following,
  requested,
  isFriend,
  context,
  presence,
  mutuals = 0,
  hasStory = false,
  badges = [],
  adminPro = null,
}: {
  user: ProfileHeaderUser;
  isMe: boolean;
  following: boolean;
  /** Ndjekja e kërkuar te një profil privat, ende pa përgjigje. */
  requested: boolean;
  isFriend: boolean;
  context: ContextReason[];
  presence: { status: PresenceStatus; lastSeenLabel: string | null } | null;
  mutuals?: number;
  hasStory?: boolean;
  /** Badge-t dalin si ikona nën numrat, me shpjegim kur kalon miun ose i prek. */
  badges?: ProfileBadge[];
  /** Vetëm kur shikuesi është admin: butoni «Jep Pro», me datën kur i mbaron Pro-ja tani. */
  adminPro?: { proUntilLabel: string | null } | null;
}) {
  const tp = useTranslations("pro");
  const router = useRouter();
  const t = useTranslations("profile");
  const ts = useTranslations("social");
  const [followState, setFollowState] = React.useState<FollowState>(
    isFriend ? "mutual" : followStateFrom(following, requested),
  );
  const [, startTransition] = React.useTransition();

  /*
    Numri i ndjekësve lëviz bashkë me butonin.

    Pa këtë, studenti shtypte «Ndiqe», butoni ndryshonte, dhe numri mbetej i
    njëjti derisa serveri të kthehej: dukej sikur ndjekja nuk u ruajt.
  */
  const followerCount =
    user.followerCount +
    (followState !== "none" ? 1 : 0) -
    (following || requested ? 1 : 0);

  function message() {
    startTransition(async () => {
      const result = await startConversation(user.id);
      if (!result.ok || !result.conversationId) {
        toast.error(ts("messageLocked"));
        return;
      }
      router.push(`/mesazhe/${result.conversationId}`);
    });
  }

  const academic = [
    t(user.isVerified ? `role_${user.role}` : "roleUnverified"),
    user.universityAbbr,
    user.facultyLabel,
    user.programLabel,
    user.degreeTitle,
    user.year ? t("yearLabel", { year: user.year }) : null,
  ].filter(Boolean);

  return (
    <Card
      className="flex flex-col gap-0 overflow-hidden p-0"
      style={user.isPro ? proAccentStyle(user.proAccent) : undefined}
    >
      <div className="h-24 w-full overflow-hidden bg-surface-2 sm:h-32">
        {user.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.cover} alt="" className="size-full object-cover" />
        ) : (
          // Pa foto kopertine: dizajni i profilit, ose theksi i zgjedhur me Pro.
          <div
            className="size-full"
            style={user.profileTheme ? { backgroundImage: "var(--pt-cover)" } : coverStyle(user.proAccent, user.proCoverStyle)}
            data-profile-cover
          />
        )}
      </div>

      <div className="flex flex-col gap-3 px-4 pb-4">
        <div className="-mt-9 flex items-end justify-between gap-3">
          {/*
            Fotoja e mbush tërë rrethin. Unaza (theksi kur ka storje ose Pro) rri drejt
            te skaji, dhe një kufi me ngjyrën e kartës e ndan nga kopertina.
          */}
          <span
            className={cn(
              "relative flex shrink-0 rounded-full shadow-[0_0_0_4px_var(--surface-solid)] ring-[3px]",
              hasStory || user.isPro ? "ring-accentpro" : "ring-border-strong",
            )}
          >
            <Avatar name={user.name} src={user.avatar} size="lg" className="size-[76px] sm:size-[88px]" />
            {presence ? <PresenceBadge status={presence.status} className="bottom-0.5 right-0.5 size-3.5" /> : null}
          </span>

          <div className="flex shrink-0 items-center gap-1.5">
            {isMe ? (
              <>
                <Button asChild variant="secondary" size="sm">
                  <Link href="/cilesimet">{t("editProfile")}</Link>
                </Button>
                {/* Veprimet e pronarit si ikona: ngarko material (7 ditë Pro) dhe Pro. */}
                <Tooltip label={tp("earnBanner")}>
                  <Button asChild variant="secondary" size="iconSm" aria-label={tp("earnBanner")}>
                    <Link href="/materialet/ngarko" data-profile-upload>
                      <Upload />
                    </Link>
                  </Button>
                </Tooltip>
                <Tooltip label={user.isPro ? tp("name") : tp("upgrade")}>
                  <Button asChild variant={user.isPro ? "secondary" : "pro"} size="iconSm" aria-label={user.isPro ? tp("name") : tp("upgrade")}>
                    <Link href="/une/pro" data-profile-pro>
                      <Sparkles />
                    </Link>
                  </Button>
                </Tooltip>
                {/* Dizajni i profilit: vetëm Pro e sheh dhe e zgjedh. */}
                {user.isPro ? <ProfileDesignDialog name={user.name} theme={user.profileTheme} nameColor={user.nameColor} /> : null}
                <ProfileMoreMenu username={user.username} userId={user.id} isMe />
              </>
            ) : (
              <>
                <FollowButton
                  targetId={user.id}
                  initialState={followState}
                  privateProfile={user.isPrivate}
                  onChange={setFollowState}
                />
                <Button variant="secondary" size="sm" onClick={message}>
                  <MessageSquare />
                  {ts("message")}
                </Button>
                {adminPro ? <ProfileProButton userId={user.id} name={user.name} proUntilLabel={adminPro.proUntilLabel} /> : null}
                <ProfileMoreMenu username={user.username} userId={user.id} isMe={false} />
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <h1
              className="text-lg font-semibold tracking-tight text-text"
              // Ngjyra e emrit është zgjedhja e lirë e pronarit Pro, e njëjtë në të dy temat.
              style={user.nameColor ? { color: user.nameColor } : undefined}
              data-profile-name
            >
              {user.name}
            </h1>
            {user.isVerified ? <VerifiedMark /> : null}
            {user.isPro ? <ProBadge /> : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-text-muted">
            <span>@{user.username}</span>
            {presence && (presence.status !== "offline" || presence.lastSeenLabel) ? (
              <>
                <span aria-hidden>·</span>
                <PresenceLine presence={presence} />
              </>
            ) : null}
          </div>
        </div>

        {user.bio ? <p className="measure text-pretty text-sm leading-relaxed text-text">{user.bio}</p> : null}

        {/* Konteksti akademik në një rresht të vetëm, i vogël. */}
        <p className="text-xs text-text-muted">{academic.join(" · ")}</p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <Stat label={t("posts")} value={user.postCount} />
          <Link href={`/u/${user.username}/ndjekesit`} className="hover:underline">
            <Stat label={t("followers")} value={followerCount} />
          </Link>
          <Link href={`/u/${user.username}/ndjek`} className="hover:underline">
            <Stat label={t("following")} value={user.followingCount} />
          </Link>
          <Link href={`/u/${user.username}/shoket`} className="hover:underline">
            <Stat label={t("friends")} value={user.friendCount} />
          </Link>
        </div>

        <ProfileBadges badges={badges} />

        {context.length > 0 || mutuals > 0 ? (
          <p className="text-xs text-text-muted">
            {mutuals > 0 ? (
              <Link href={`/u/${user.username}/ndjekesit`} className="hover:underline">
                {t("mutuals", { count: mutuals })}
              </Link>
            ) : (
              <ReasonLine reason={context[0]} />
            )}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

function PresenceLine({
  presence,
}: {
  presence: { status: PresenceStatus; lastSeenLabel: string | null };
}) {
  const tp = useTranslations("presence");

  if (presence.status !== "offline") {
    return (
      <span className="inline-flex items-center gap-1.5 text-success-text">
        <PresenceDot status={presence.status} />
        {tp(presence.status)}
      </span>
    );
  }

  return <span>{presence.lastSeenLabel}</span>;
}

function Stat({ label, value }: { label: string; value: number }) {
  const locale = useLocale();

  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="tabular text-sm font-semibold text-text">{formatNumber(value, locale)}</span>
      <span className="text-text-muted">{label}</span>
    </span>
  );
}
