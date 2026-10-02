"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Avatar, type AvatarSize } from "@/components/ui/avatar";
import { FacultyChip } from "./faculty-chip";
import { ProBadge } from "./pro-badge";
import { VerifiedMark } from "./verified-mark";
import { FollowButton, followStateFrom } from "@/components/social/follow-button";
import { PresenceBadge } from "@/components/social/presence-dot";
import { cn } from "@/lib/utils";

/** Identiteti i përdoruesit, një komponent i vetëm për tërë platformën. */
export type IdentityUser = {
  name: string;
  username: string;
  avatar?: string | null;
  isVerified?: boolean;
  isPro?: boolean;
  universityAbbr?: string | null;
  facultyCode?: string | null;
  /** Emri i shkurtër i fakultetit, i marrë nga baza sipas gjuhës aktive. */
  facultyLabel?: string | null;
  year?: number | null;
};

type IdentitySize = "sm" | "md" | "lg" | "post";

const SIZE_MAP: Record<IdentitySize, { avatar: AvatarSize; avatarClass?: string; name: string; meta: string }> = {
  sm: { avatar: "sm", name: "text-sm", meta: "text-xs" },
  md: { avatar: "md", name: "text-sm", meta: "text-xs" },
  lg: { avatar: "lg", name: "text-base", meta: "text-sm" },
  /** Koka e postimit: avatar 48, emri 16 i trashë, rreshti meta me germa mono. */
  post: { avatar: "md", avatarClass: "size-12 text-[15px]", name: "font-display text-base font-bold", meta: "text-[13px]" },
};

export function UserIdentityLine({
  user,
  size = "md",
  showFaculty = true,
  showYear = true,
  inline = false,
  trailing,
  context,
  follow,
  linked = true,
  online = false,
  className,
}: {
  user: IdentityUser;
  size?: IdentitySize;
  showFaculty?: boolean;
  showYear?: boolean;
  /** Të gjitha në një rresht. Përdoret te komentet. */
  inline?: boolean;
  trailing?: React.ReactNode;
  /** Konteksti i përbashkët, p.sh. «2 lëndë të përbashkëta». Kurrë profil pa arsye. */
  context?: string;
  /** Butoni Ndiq te koka e postimit, kur autori nuk ndiqet ende. */
  follow?: { userId: string; following: boolean };
  /** false kur rreshti vetë është tashmë lidhje, p.sh. te lista e bisedave. */
  linked?: boolean;
  /** Pika e gjelbër mbi avatar. Vetëm për njerëzit që shikuesi i ndjek. */
  online?: boolean;
  className?: string;
}) {
  const t = useTranslations("identity");
  const dimensions = SIZE_MAP[size];
  const large = size === "lg" || size === "post";

  const hasMeta =
    Boolean(user.universityAbbr) ||
    (showFaculty && Boolean(user.facultyLabel)) ||
    (showYear && Boolean(user.year));

  const meta = hasMeta ? (
    <span
      className={cn(
        "flex min-w-0 items-center gap-1.5 text-text-muted",
        dimensions.meta,
        inline && "shrink-0",
      )}
    >
      {user.universityAbbr ? <span className="shrink-0">{user.universityAbbr}</span> : null}

      {user.universityAbbr && showFaculty && user.facultyLabel ? (
        <span aria-hidden>·</span>
      ) : null}

      {showFaculty && user.facultyLabel ? (
        <FacultyChip
          code={user.facultyCode ?? "economics"}
          label={user.facultyLabel}
          href={linked ? `/feed?fakulteti=${user.facultyCode ?? ""}` : undefined}
          ariaLabel={linked ? t("openFaculty", { faculty: user.facultyLabel }) : undefined}
          size={size === "lg" ? "md" : "sm"}
          className="min-w-0"
        />
      ) : null}

      {showYear && user.year ? (
        <>
          <span aria-hidden>·</span>
          <span className="shrink-0">{t("year", { year: user.year })}</span>
        </>
      ) : null}
    </span>
  ) : null;

  const nameRow = (
    <span className={cn("flex min-w-0 items-center", size === "post" ? "gap-[7px]" : "gap-1.5")}>
      {linked ? (
        <Link
          href={`/u/${user.username}`}
          aria-label={t("openProfile", { name: user.name })}
          className={cn(
            "truncate font-semibold text-text transition-colors duration-150 hover:text-brand-500",
            dimensions.name,
          )}
        >
          {user.name}
        </Link>
      ) : (
        <span className={cn("truncate font-semibold text-text", dimensions.name)}>{user.name}</span>
      )}
      {user.isVerified ? <VerifiedMark size={large ? "lg" : "sm"} /> : null}
      {user.isPro ? <ProBadge size={size === "lg" ? "md" : "sm"} /> : null}
    </span>
  );

  return (
    <div className={cn("flex min-w-0 items-center", size === "post" ? "gap-3" : "gap-2.5", className)}>
      <span className="relative shrink-0">
        {linked ? (
          <Link href={`/u/${user.username}`} tabIndex={-1} aria-hidden>
            <Avatar name={user.name} src={user.avatar} size={dimensions.avatar} className={dimensions.avatarClass} />
          </Link>
        ) : (
          <Avatar name={user.name} src={user.avatar} size={dimensions.avatar} className={dimensions.avatarClass} />
        )}
        {online ? (
          <PresenceBadge status="online" className={cn("bottom-0 right-0", size === "post" ? "size-3" : "size-2.5")} />
        ) : null}
      </span>

      {inline ? (
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          {nameRow}
          {meta}
        </span>
      ) : (
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          {nameRow}
          {meta}
          {context ? (
            <span className={cn("truncate text-brand-500", dimensions.meta)}>{context}</span>
          ) : null}
        </span>
      )}

      {follow ? (
        <span className="ml-auto shrink-0">
          <FollowButton
            targetId={follow.userId}
            initialState={followStateFrom(follow.following)}
          />
        </span>
      ) : null}

      {trailing ? <span className={cn("shrink-0", !follow && "ml-auto")}>{trailing}</span> : null}
    </div>
  );
}
