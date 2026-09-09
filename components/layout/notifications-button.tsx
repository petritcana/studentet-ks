"use client";

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
import { toast } from "@/components/ui/toast";
import { EmptyState } from "@/components/shared/empty-state";
import { markNotificationsRead } from "@/lib/actions/notifications";
import { followUser } from "@/lib/actions/social";
import { timeAgoShort } from "@/lib/format";
import { cn } from "@/lib/utils";

type NotificationActor = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  isVerified: boolean;
  faculty: string | null;
  year: number | null;
  alreadyFollowing: boolean;
};

type NotificationItem = {
  id: string;
  type: string;
  text: string;
  context: string | null;
  isRead: boolean;
  createdAt: string;
  targetId: string | null;
  actor: NotificationActor | null;
};

export function NotificationsButton({ initialUnread }: { initialUnread: number }) {
  const router = useRouter();
  const t = useTranslations("notifications");
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotificationItem[] | null>(null);
  const [unread, setUnread] = React.useState(initialUnread);
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
        await markNotificationsRead();
        router.refresh();
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [open, router]);

  function followBack(actor: NotificationActor) {
    setItems((current) =>
      current?.map((item) =>
        item.actor?.id === actor.id
          ? { ...item, actor: { ...item.actor, alreadyFollowing: true } }
          : item,
      ) ?? null,
    );

    startTransition(async () => {
      const result = await followUser(actor.id);
      if (!result.ok) {
        toast.error(result.message ?? "S'u ndoq dot.");
        return;
      }
      toast.success(
        result.message?.includes("shokë") ? "U bëtë shokë" : `E ndoqe ${actor.name}`,
        { description: "DM-ja mes jush është e hapur." },
      );
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
          "relative grid size-10 place-items-center rounded-full text-text-muted",
          "transition-colors duration-150 ease-brand hover:bg-surface hover:text-text",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
        )}
      >
        <Bell className="size-5" />
        {unread > 0 ? (
          <span className="tabular absolute right-1 top-1 min-w-4 rounded-full bg-accent-500 px-1 text-[10px] font-semibold leading-4 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{t("title")}</SheetTitle>
            <SheetDescription>{t("description")}</SheetDescription>
          </SheetHeader>

          <SheetBody>
            {items === null ? (
              <div className="flex flex-col gap-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <SkeletonPerson key={index} />
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                illustration="feed"
                compact
                title={t("empty")}
                description={t("emptyHint")}
              />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={cn("flex gap-3 py-3", !item.isRead && "-mx-2 rounded-md bg-brand-500/6 px-2")}
                  >
                    {item.actor ? (
                      <Link href={`/u/${item.actor.username}`} onClick={() => setOpen(false)}>
                        <Avatar
                          name={item.actor.name}
                          src={item.actor.avatar}
                          size="sm"
                          verified={item.actor.isVerified}
                        />
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
                        {item.text}
                        {item.actor?.faculty ? (
                          <span className="text-text-muted">
                            {" "}
                            ({item.actor.faculty}
                            {item.actor.year ? `, viti ${item.actor.year}` : ""})
                          </span>
                        ) : null}
                      </p>

                      {item.context ? (
                        <p className="text-xs text-text-muted">{item.context}</p>
                      ) : null}

                      <div className="flex items-center gap-3">
                        <span className="tabular text-xs text-text-muted">
                          {timeAgoShort(item.createdAt)}
                        </span>

                        {item.type === "follow" && item.actor && !item.actor.alreadyFollowing ? (
                          <Button size="sm" onClick={() => followBack(item.actor!)}>
                            {t("followBack")}
                          </Button>
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
