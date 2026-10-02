import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Bell } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { SegmentedNav } from "@/components/shared/segmented-nav";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read";
import { FollowRequests } from "@/components/social/follow-requests";
import { FollowBackButton } from "@/components/social/follow-back-button";
import { FOLLOW_PENDING, acceptedFollow } from "@/lib/follow";
import { db, parseJson } from "@/lib/db";
import { actorSummary, groupNotifications } from "@/lib/notifications";
import { timeAgo } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { NOTIFICATION_CATEGORIES } from "@/lib/types";
import { cn } from "@/lib/utils";

const TAB_KEYS: Record<string, string> = {
  all: "tabAll",
  kerkesa: "tabRequests",
  social: "tabSocial",
  academic: "tabAcademic",
  progress: "tabProgress",
  jobs: "tabJobs",
  system: "tabSystem",
  competition: "tabCompetition",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notifications");
  return { title: t("title") };
}

export const dynamic = "force-dynamic";

function hrefFor(targetType: string | null, targetId: string | null) {
  // Njoftimet e garës pa objekt të vetin (fundi i javës, renditja) çojnë te gara.
  if (targetType === "competition") return "/gara";
  if (!targetId) return null;
  if (targetType === "post") return `/postimi/${targetId}`;
  if (targetType === "material") return `/materialet/${targetId}`;
  if (targetType === "question") return `/pyetje/${targetId}`;
  if (targetType === "event") return `/eventet/${targetId}`;
  if (targetType === "conversation") return `/mesazhe/${targetId}`;
  if (targetType === "profile") return `/u/${targetId}`;
  if (targetType === "job") return `/karriera/${targetId}`;
  if (targetType === "battle") return `/gara/beteja/${targetId}`;
  if (targetType === "team_event") return `/gara/ngjarje/${targetId}`;
  return null;
}

/** Rreshti i aktorëve, i përkthyer sipas numrit të tyre. */
function actorLine(actors: string[], t: (key: string, values?: Record<string, string | number>) => string) {
  const summary = actorSummary(actors);
  return t(`actors_${summary.key}`, summary.values);
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [me, locale, params, t, te] = await Promise.all([
    requireUser(),
    getLocale(),
    searchParams,
    getTranslations("notifications"),
    getTranslations("empty"),
  ]);

  const tab = params.tab ?? "all";

  // Kërkesat për ndjekje nuk janë njoftim që lexohet, por vendim që merret.
  const requests = await db.follow.findMany({
    where: { followingId: me.id, status: FOLLOW_PENDING },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { follower: { select: { id: true, name: true, username: true, avatar: true } } },
  });
  const tg = await getTranslations("notifications");

  const rows = await db.notification.findMany({
    where: {
      userId: me.id,
      ...(tab !== "all" && tab !== "kerkesa" ? { category: tab } : {}),
      // Kërkesat kanë skedën e vet me butonat Prano dhe Refuzo, prandaj nuk
      // përsëriten si rreshta të thjeshtë njoftimi.
      type: { not: "follow_request" },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      type: true,
      category: true,
      payload: true,
      groupKey: true,
      isRead: true,
      createdAt: true,
      targetId: true,
      targetType: true,
      actor: { select: { id: true, name: true, username: true, avatar: true } },
    },
  });

  // Kë ndjek tashmë: «Ndiqe edhe ti» del vetëm kur ka kuptim.
  const actorIds = [
    ...new Set([...rows.flatMap((row) => (row.actor ? [row.actor.id] : [])), ...requests.map((row) => row.follower.id)]),
  ];
  const following = new Set(
    actorIds.length
      ? (
          await db.follow.findMany({
            where: { ...acceptedFollow, followerId: me.id, followingId: { in: actorIds } },
            select: { followingId: true },
          })
        ).map((row) => row.followingId)
      : [],
  );

  // Bashkimi kalon nga `lib/notifications.ts`, i cili e njeh edhe numrin e
  // aktorëve: kështu rreshti thotë «Arta, Blerimi dhe 3 të tjerë», jo pesë herë
  // e njëjta gjë.
  const items = groupNotifications(
    rows.map((row) => ({
      ...row,
      groupKey: row.groupKey,
      actorName: row.actor?.name ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <header className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-text">{t("title")}</h1>
          <p className="measure text-sm text-text-muted">{t("subtitle")}</p>
        </div>
        <MarkAllReadButton />
      </header>

      {/*
        Kërkesat kanë skedën e vet, me numrin përkrah. Një kërkesë ndjekjeje është
        vendim që pret dikë, prandaj nuk varroset mes pëlqimeve dhe komenteve.
      */}
      <SegmentedNav
        base="/njoftimet"
        active={tab}
        items={["all", "kerkesa", ...NOTIFICATION_CATEGORIES].filter((category) => TAB_KEYS[category]).map((category) => ({
          value: category,
          label: t(TAB_KEYS[category]),
          count: category === "kerkesa" ? requests.length : undefined,
        }))}
      />

      {tab === "kerkesa" ? (
        requests.length === 0 ? (
          <EmptyState illustration="people" title={t("requestsEmpty")} description={t("requestsEmptyBody")} />
        ) : (
          <FollowRequests
            requests={requests.map((row) => ({ ...row.follower, alreadyFollowing: following.has(row.follower.id) }))}
          />
        )
      ) : items.length === 0 ? (
        <EmptyState
          illustration="bell"
          title={te("notifications.title")}
          description={te("notifications.body")}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {items.map((item) => {
            const payload = parseJson<Record<string, string | number>>(item.payload, {});
            const href = hrefFor(item.targetType, item.targetId);

            const body = (
              <div
                className={cn(
                  "flex gap-3 py-3",
                  !item.isRead && "-mx-2 rounded-md bg-brand-500/6 px-2",
                )}
              >
                {item.actor ? (
                  <Avatar name={item.actor.name} src={item.actor.avatar} size="sm" />
                ) : (
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-500/12 text-brand-500">
                    <Bell className="size-4" />
                  </span>
                )}

                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="text-sm text-text">
                    {item.actors.length > 0 ? (
                      <span className="font-medium">{actorLine(item.actors, tg)} </span>
                    ) : null}
                    {t(item.type, payload)}
                  </p>
                  <span className="tabular text-xs text-text-muted">
                    {timeAgo(item.createdAt, locale)}
                  </span>
                </div>

              </div>
            );

            const followBack =
              item.type === "follow" && item.actor && item.actors.length <= 1 && !following.has(item.actor.id)
                ? item.actor
                : null;

            return (
              <li key={item.id} className="flex items-center gap-2">
                {href ? (
                  <Link href={href} className="block min-w-0 flex-1 transition-colors hover:bg-surface/60">
                    {body}
                  </Link>
                ) : (
                  <div className="min-w-0 flex-1">{body}</div>
                )}
                {/* Jashtë lidhjes: butoni brenda një <a> nuk është HTML i vlefshëm. */}
                {followBack ? <FollowBackButton userId={followBack.id} name={followBack.name} className="shrink-0" /> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
