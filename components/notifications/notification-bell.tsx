"use client";

import { TimeAgo } from "@/components/shared/time-ago";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SkeletonPerson } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "@/components/ui/toast";
import { markAllRead } from "@/lib/actions/notifications";
import { acceptFollowRequest, declineFollowRequest, followUser } from "@/lib/actions/social";
import { cn } from "@/lib/utils";

export type NotificationItem = {
  id: string;
  category: string;
  type: string;
  payload: Record<string, string | number>;
  isRead: boolean;
  createdAt: string;
  href: string | null;
  actor: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
    facultyLabel: string | null;
    year: number | null;
    alreadyFollowing: boolean;
  } | null;
};

export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const router = useRouter();
  const t = useTranslations("notifications");
  const tc = useTranslations("common");
  const ts = useTranslations("social");
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotificationItem[] | null>(null);
  const [unread, setUnread] = React.useState(initialUnread);
  // Kërkesat e vendosura zhduken nga paneli pa e mbyllur atë.
  const [decided, setDecided] = React.useState<Record<string, "accepted" | "declined">>({});
  const [, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      const response = await fetch("/api/njoftimet");
      if (!response.ok) return;
      const data = await response.json();
      if (cancelled) return;
      setItems(data.items);
      setUnread(0);
      startTransition(async () => {
        await markAllRead();
        router.refresh();
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [open, router]);

  function followBack(actorId: string, name: string) {
    setItems(
      (current) =>
        current?.map((item) =>
          item.actor?.id === actorId
            ? { ...item, actor: { ...item.actor, alreadyFollowing: true } }
            : item,
        ) ?? null,
    );

    startTransition(async () => {
      const result = await followUser(actorId);
      if (!result.ok) return;
      toast.success(
        result.messageKey === "social.nowFriends" ? ts("nowFriends") : `${ts("following")} ${name}`,
      );
      router.refresh();
    });
  }

  /*
    Kërkesa për ndjekje vendoset aty ku shfaqet.

    Dikur paneli e tregonte vetëm rreshtin «kërkon të të ndjekë», pa asnjë buton,
    dhe vendimi fshihej te një skedë e veçantë e njoftimeve. Kush e lexonte
    njoftimin, aty edhe duhet të mund të thotë po ose jo.
  */
  function decide(actorId: string, accept: boolean) {
    setDecided((current) => ({ ...current, [actorId]: accept ? "accepted" : "declined" }));

    startTransition(async () => {
      const result = accept
        ? await acceptFollowRequest(actorId)
        : await declineFollowRequest(actorId);

      if (!result.ok) {
        setDecided((current) => {
          const next = { ...current };
          delete next[actorId];
          return next;
        });
        toast.error(tc("retry"));
        return;
      }

      if (accept) toast.success(ts("requestAccepted"));
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={unread > 0 ? `${t("title")} (${unread})` : t("title")}
        className={cn(
          "relative grid size-10 place-items-center rounded-control text-text lg:size-[42px]",
          "transition-colors duration-150 ease-brand hover:bg-surface-2 hover:text-text",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
        )}
      >
        <Bell className="size-[19px]" />
        {unread > 0 ? (
          <span className="tabular absolute right-1 top-1 min-w-4 rounded-full bg-like px-1 text-center text-[10px] font-bold leading-4 text-bg ring-2 ring-bg">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{t("title")}</SheetTitle>
            <SheetDescription>{t("subtitle")}</SheetDescription>
          </SheetHeader>

          <SheetBody>
            {items === null ? (
              <div className="flex flex-col gap-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <SkeletonPerson key={index} label={tc("loading")} />
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState illustration="bell" compact title={t("empty")} description={t("emptyBody")} />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={cn("flex gap-3 py-3", !item.isRead && "-mx-2 rounded-control bg-primary-soft px-2")}
                  >
                    {item.actor ? (
                      <Link href={`/u/${item.actor.username}`} onClick={() => setOpen(false)}>
                        <Avatar name={item.actor.name} src={item.actor.avatar} size="sm" />
                      </Link>
                    ) : (
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-500/12 text-brand-500">
                        <Bell className="size-4" />
                      </span>
                    )}

                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="text-sm text-text">
                        {item.actor ? (
                          <Link
                            href={`/u/${item.actor.username}`}
                            onClick={() => setOpen(false)}
                            className="font-medium hover:text-brand-500"
                          >
                            {item.actor.name}
                          </Link>
                        ) : null}{" "}
                        {t(item.type, item.payload)}
                      </p>

                      {item.type === "follow" && Number(item.payload.shared ?? 0) > 0 ? (
                        <p className="text-xs text-text-muted">
                          {t("followShared", { shared: item.payload.shared })}
                        </p>
                      ) : null}

                      <div className="flex items-center gap-3">
                        <span className="tabular text-xs text-text-muted">
                          <TimeAgo value={item.createdAt} />
                        </span>

                        {item.type === "follow" && item.actor && !item.actor.alreadyFollowing ? (
                          <Button
                            size="sm"
                            onClick={() => followBack(item.actor!.id, item.actor!.name)}
                            data-follow-back
                          >
                            {ts("followBack")}
                          </Button>
                        ) : null}

                        {item.type === "follow_request" && item.actor ? (
                          decided[item.actor.id] ? (
                            // Pas pranimit, ndjekja mbrapsht është një prekje larg, pa hapur profilin.
                            decided[item.actor.id] === "accepted" && !item.actor.alreadyFollowing ? (
                              <Button size="sm" onClick={() => followBack(item.actor!.id, item.actor!.name)} data-follow-back>
                                {ts("followBack")}
                              </Button>
                            ) : (
                              <span className="text-xs text-text-muted">
                                {decided[item.actor.id] === "accepted" ? ts("requestAccepted") : ts("decline")}
                              </span>
                            )
                          ) : (
                            <span className="flex items-center gap-2">
                              <Button size="sm" onClick={() => decide(item.actor!.id, true)}>
                                {ts("accept")}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => decide(item.actor!.id, false)}
                              >
                                {ts("decline")}
                              </Button>
                            </span>
                          )
                        ) : null}

                        {item.href ? (
                          <Link
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className="text-xs text-brand-500 hover:underline"
                          >
                            {tc("open")}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}
