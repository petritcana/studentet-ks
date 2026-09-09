import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { facultyTheme } from "@/lib/faculties";
import { YEAR_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { FollowButton, type FollowState } from "./follow-button";
import { MutualContext } from "./mutual-context";

export type UserCardPerson = {
  id: string;
  name: string;
  username: string;
  avatar?: string | null;
  bio?: string | null;
  isVerified?: boolean;
  facultyName?: string | null;
  facultyColor?: string | null;
  year?: number | null;
  city?: string | null;
  reasons?: string[];
};

function facultyShort(name?: string | null) {
  if (!name) return null;
  return name.replace("Fakulteti i ", "").replace("Fakulteti ", "");
}

/** Rresht kompakt: listat, sugjerimet, anëtarët e grupit. */
export function UserRow({
  person,
  followState,
  action,
  className,
}: {
  person: UserCardPerson;
  followState?: FollowState;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Link href={`/u/${person.username}`} className="shrink-0">
        <Avatar name={person.name} src={person.avatar} verified={person.isVerified} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          href={`/u/${person.username}`}
          className="truncate text-sm font-medium text-text hover:text-brand-500"
        >
          {person.name}
        </Link>
        {person.reasons && person.reasons.length > 0 ? (
          <MutualContext reasons={person.reasons} />
        ) : (
          <span className="truncate text-xs text-text-muted">
            {[facultyShort(person.facultyName), person.year ? YEAR_LABELS[person.year] : null]
              .filter(Boolean)
              .join(", ")}
          </span>
        )}
      </div>
      {action ?? (followState ? (
        <FollowButton targetId={person.id} initialState={followState} />
      ) : null)}
    </div>
  );
}

/** Kartë e plotë: faqja e Kampusit dhe karruseli i sugjerimeve. */
export function UserCard({
  person,
  followState = "none",
  className,
}: {
  person: UserCardPerson;
  followState?: FollowState;
  className?: string;
}) {
  const theme = facultyTheme(person.facultyColor);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-surface p-4",
        "transition-shadow duration-250 ease-brand hover:shadow-lifted",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Link href={`/u/${person.username}`} className="shrink-0">
          <Avatar name={person.name} src={person.avatar} size="lg" verified={person.isVerified} />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Link
            href={`/u/${person.username}`}
            className="truncate text-sm font-semibold text-text hover:text-brand-500"
          >
            {person.name}
          </Link>
          {person.facultyName ? (
            <Badge variant="neutral" className={cn(theme.bg, theme.text, theme.border)}>
              {facultyShort(person.facultyName)}
              {person.year ? `, ${YEAR_LABELS[person.year]?.toLowerCase()}` : ""}
            </Badge>
          ) : null}
        </div>
      </div>

      {person.bio ? (
        <p className="line-clamp-2 text-xs text-text-muted">{person.bio}</p>
      ) : null}

      {person.reasons && person.reasons.length > 0 ? (
        <MutualContext reasons={person.reasons} max={2} />
      ) : null}

      <FollowButton targetId={person.id} initialState={followState} className="w-full" />
    </div>
  );
}
