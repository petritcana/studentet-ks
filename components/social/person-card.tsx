"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { UserIdentityLine } from "@/components/identity/user-identity-line";
import { FollowButton, followStateFrom } from "@/components/social/follow-button";
import type { ContextReason, SuggestedPerson } from "@/lib/suggestions";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { startConversation } from "@/lib/actions/messages";
import { cn } from "@/lib/utils";

/**
 * Karta e njeriut: mbështet rreshtin e zakonshëm, pamjen kompakte,
 * dhe formatin origjinal të pllakëzës (tile 2x2) për studentët e vitit tënd.
 */
export function PersonCard({
  person,
  following = false,
  compact = false,
  tile = false,
  quietFollow = false,
  showMessage = false,
  className,
}: {
  person: SuggestedPerson;
  following?: boolean;
  compact?: boolean;
  tile?: boolean;
  /** Në rrjetë me shumë karta, ndjekja del si kornizë, jo si limon i plotë në çdo kartë. */
  quietFollow?: boolean;
  /** Butoni i vogël që hap bisedën me personin, pa kaluar nga profili. */
  showMessage?: boolean;
  className?: string;
}) {
  if (tile) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-between rounded-xl border border-border/70 bg-surface-2/40 p-3 text-center transition-all duration-150 hover:border-brand-500/30 hover:bg-surface",
          className,
        )}
      >
        <Link href={`/u/${person.username}`} className="group flex flex-col items-center gap-1.5 w-full">
          <Avatar name={person.name} src={person.avatar} size="md" className="size-10 border border-bg ring-1 ring-border/60" />
          <span className="w-full truncate text-xs font-semibold text-text group-hover:text-brand-500">
            {person.name}
          </span>
          <span className="w-full truncate text-[10px] text-text-muted">
            {person.facultyLabel ?? `@${person.username}`}
          </span>
        </Link>

        <FollowButton
          targetId={person.id}
          initialState={followStateFrom(following)}
          quiet
          className="mt-2 h-7 w-full min-w-0 px-2 text-[11px] font-medium"
        />
      </div>
    );
  }

  const body = (
    <>
      <UserIdentityLine
        user={person}
        size={compact ? "sm" : "md"}
        showYear={!compact}
        className="min-w-0"
      />

      {person.reasons.length > 0 ? (
        <p className="truncate text-xs text-text-muted">
          <ReasonLine reason={person.reasons[0]} />
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <FollowButton
          targetId={person.id}
          initialState={followStateFrom(following)}
          quiet={compact || quietFollow}
          className="min-w-0 flex-1"
        />
        {showMessage ? <MessageButton person={person} /> : null}
      </div>
    </>
  );

  if (compact) {
    return <div className={cn("flex flex-col gap-2", className)}>{body}</div>;
  }

  return <Card className={cn("flex flex-col gap-3 p-4", className)}>{body}</Card>;
}

/** Arsyeja vjen si çelës plus vlera, që përkthimi të ndodhë vetëm këtu. */
export function ReasonLine({ reason }: { reason: ContextReason }) {
  const t = useTranslations("context");
  return <>{t(reason.key, reason.values ?? {})}</>;
}

/** Hap bisedën me personin: ekzistuesen, ose nis një të re. */
function MessageButton({ person }: { person: SuggestedPerson }) {
  const router = useRouter();
  const t = useTranslations("messages");
  const social = useTranslations("social");
  const errors = useTranslations("errors");
  const [pending, startTransition] = React.useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      aria-label={`${t("write")}: ${person.name}`}
      title={t("write")}
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await startConversation(person.id);
          if (!result.ok || !result.conversationId) {
            const key = result.messageKey ?? "";
            toast.error(key.startsWith("social.") ? social(key.replace("social.", "")) : errors("generic"));
            return;
          }
          router.push(`/mesazhe/${result.conversationId}`);
        })
      }
    >
      <MessageCircle />
    </Button>
  );
}
