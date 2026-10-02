import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CalendarPlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { EventCard } from "@/components/campus/event-card";
import { CreateGroupDialog } from "@/components/campus/create-group-dialog";
import { GroupCard } from "@/components/campus/group-card";
import { PersonCard } from "@/components/social/person-card";
import { CircleButtons } from "@/components/social/circle-buttons";
import { SegmentedNav } from "@/components/shared/segmented-nav";
import { db } from "@/lib/db";
import { StudyTogether, type StudySessionDto } from "@/components/campus/study-together";
import { CampusVoiceComposer } from "@/components/feed/campus-voice-composer";
import { FeedList } from "@/components/feed/feed-list";
import { meetsLevelTwo } from "@/lib/moderation";
import { getEvents, getGroups } from "@/lib/queries/campus";
import { getFeed } from "@/lib/queries/feed";
import { requireUser } from "@/lib/session";
import { getCampusPeople, isPeopleView, PEOPLE_VIEWS, type PeopleView } from "@/lib/queries/campus-people";
import { cn } from "@/lib/utils";

const TABS = ["njerez", "grupet", "eventet", "studio", "zeri"] as const;
type CampusTab = (typeof TABS)[number];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("campus");
  return { title: t("title"), description: t("subtitle") };
}

export const dynamic = "force-dynamic";

export default async function CampusPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; pamja?: string; q?: string }>;
}) {
  const [me, locale, params, t, te] = await Promise.all([
    requireUser(),
    getLocale(),
    searchParams,
    getTranslations("campus"),
    getTranslations("empty"),
  ]);

  const [tStudy, tFeed, tCompetition] = await Promise.all([
    getTranslations("study"),
    getTranslations("feed"),
    getTranslations("competition"),
  ]);

  const tab = (TABS.includes(params.tab as CampusTab) ? params.tab : "njerez") as CampusTab;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text">{t("title")}</h1>
        <p className="measure text-sm text-text-muted">{t("subtitle")}</p>
      </header>

      {/* Gara jeton te Komuniteti, jo si zë i gjashtë i shtyllës së majtë. */}
      <Link
        href="/gara"
        data-competition-card
        className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-500/50 hover:shadow-soft"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent-500/15 text-2xl" aria-hidden>
          🏆
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold text-text">{tCompetition("communityCardTitle")}</span>
          <span className="text-xs text-text-muted">{tCompetition("communityCardBody")}</span>
        </span>
        <span className="text-sm font-medium text-brand-600 group-hover:underline dark:text-brand-500">
          {tCompetition("communityCardCta")}
        </span>
      </Link>

      <SegmentedNav
        base="/komuniteti"
        active={tab}
        items={[
          { value: "njerez", label: t("tabPeople") },
          { value: "grupet", label: t("tabGroups") },
          { value: "eventet", label: t("tabEvents") },
          { value: "studio", label: tStudy("title") },
          { value: "zeri", label: tFeed("tabCampusVoice") },
        ]}
      />

      {tab === "njerez" ? (
        <PeopleTab
          viewer={{ id: me.id, universityId: me.universityId, facultyId: me.facultyId, year: me.year }}
          view={isPeopleView(params.pamja) ? params.pamja : "per-ty"}
          query={params.q ?? ""}
          locale={locale}
        />
      ) : null}
      {tab === "grupet" ? <GroupsTab user={me} locale={locale} /> : null}
      {tab === "eventet" ? <EventsTab user={me} emptyTitle={te("feed.title")} /> : null}
      {tab === "studio" ? <StudyTab userId={me.id} locale={locale} /> : null}
      {tab === "zeri" ? <CampusVoiceTab user={me} locale={locale} /> : null}
    </div>
  );
}

async function PeopleTab({
  viewer,
  view,
  query,
  locale,
}: {
  viewer: { id: string; universityId: string | null; facultyId: string | null; year: number | null };
  view: PeopleView;
  query: string;
  locale: string;
}) {
  const [{ people, followingIds }, t, ts, te] = await Promise.all([
    getCampusPeople(viewer, view, { query, locale }),
    getTranslations("campus"),
    getTranslations("social"),
    getTranslations("empty"),
  ]);
  const following = new Set(followingIds);
  const searching = query.trim().length >= 2;

  const viewHref = (next: PeopleView) => (next === "per-ty" ? "/komuniteti?tab=njerez" : `/komuniteti?tab=njerez&pamja=${next}`);

  return (
    <div className="flex flex-col gap-4">
      {/* Kërkimi i kalon të gjitha pamjet: kushdo në platformë, me emër ose @emër. */}
      <form action="/komuniteti" className="flex gap-2" data-people-find>
        <input type="hidden" name="tab" value="njerez" />
        {view !== "per-ty" ? <input type="hidden" name="pamja" value={view} /> : null}
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-surface-2 px-4 transition-colors focus-within:border-brand-500">
          <Search className="size-4 shrink-0 text-text-muted" aria-hidden />
          <input
            name="q"
            defaultValue={query}
            placeholder={t("peopleSearch")}
            aria-label={t("peopleSearch")}
            className="min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-dim"
          />
        </label>
        <Button type="submit" variant="secondary" className="h-11 rounded-full px-5">
          {t("peopleSearchButton")}
        </Button>
      </form>

      {!searching ? (
        <nav aria-label={t("peopleViews")} className="-mx-4 flex gap-2 overflow-x-auto scrollbar-none px-4 sm:mx-0 sm:flex-wrap sm:px-0" data-people-views>
          {PEOPLE_VIEWS.map((value) => (
            <Link
              key={value}
              href={viewHref(value)}
              aria-current={view === value ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors duration-150",
                view === value
                  ? "border-brand-500/60 bg-brand-50 text-text"
                  : "border-border bg-surface-2 text-text-muted hover:border-border-strong hover:text-text",
              )}
            >
              {t(`peopleView_${value}`)}
            </Link>
          ))}
        </nav>
      ) : (
        <p className="text-sm text-text-muted">{t("peopleResults", { query: query.trim() })}</p>
      )}

      {view === "per-ty" && !searching ? <CircleButtons /> : null}

      {people.length === 0 ? (
        <EmptyState
          illustration="people"
          title={searching ? t("peopleNoResults") : te("people.title")}
          description={searching ? t("peopleNoResultsBody") : t(`peopleEmpty_${view}`)}
        />
      ) : (
        <>
          <p className="text-xs text-text-muted">{searching ? null : view === "per-ty" ? ts("suggestedNote") : t(`peopleNote_${view}`)}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-people-grid>
            {people.map((person) => (
              <PersonCard key={person.id} person={person} following={following.has(person.id)} quietFollow showMessage />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

async function GroupsTab({
  user,
  locale,
}: {
  user: { id: string; facultyId: string | null; year: number | null };
  locale: string;
}) {
  const [{ mine, discover }, t] = await Promise.all([
    getGroups(user, locale),
    getTranslations("campus"),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="measure text-sm text-text-muted">{t("createGroupBody")}</p>
        <CreateGroupDialog />
      </div>

      {mine.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-text">{t("myGroups", { count: mine.length })}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {mine.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">{t("discoverGroups")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {discover.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      </section>
    </div>
  );
}

async function EventsTab({
  user,
  emptyTitle,
}: {
  user: { id: string; facultyId: string | null; year: number | null };
  emptyTitle: string;
}) {
  const [events, t] = await Promise.all([getEvents(user), getTranslations("campus")]);

  return (
    <div className="flex flex-col gap-4">
      <Button asChild size="sm" className="self-start">
        <Link href="/eventet/krijo">
          <CalendarPlus />
          {t("createEvent")}
        </Link>
      </Button>

      {events.length === 0 ? (
        <EmptyState illustration="calendar" title={emptyTitle} description={t("noEvents")} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Sesionet e ardhshme te "Studio bashke", me ata që kane thene se vijne. */
async function StudyTab({ userId, locale }: { userId: string; locale: string }) {
  const english = locale === "en";

  const sessions = await db.studyTogether.findMany({
    where: { startsAt: { gte: new Date(Date.now() - 3_600_000) } },
    orderBy: { startsAt: "asc" },
    take: 20,
    select: {
      id: true,
      title: true,
      place: true,
      startsAt: true,
      capacity: true,
      note: true,
      author: { select: { name: true } },
      course: { select: { name: true, nameEn: true } },
      joiners: {
        select: { userId: true, user: { select: { name: true, avatar: true } } },
      },
    },
  });

  const rows: StudySessionDto[] = sessions.map((session) => ({
    id: session.id,
    title: session.title,
    place: session.place,
    startsAt: session.startsAt.toISOString(),
    capacity: session.capacity,
    note: session.note,
    courseName: session.course ? (english ? session.course.nameEn : session.course.name) : null,
    authorName: session.author.name,
    joined: session.joiners.some((join) => join.userId === userId),
    joiners: session.joiners.map((join) => ({
      name: join.user.name,
      avatar: join.user.avatar,
    })),
  }));

  return <StudyTogether sessions={rows} />;
}

async function CampusVoiceTab({
  user,
  locale,
}: {
  user: Awaited<ReturnType<typeof requireUser>>;
  locale: string;
}) {
  const [feed, tVoice] = await Promise.all([
    getFeed(user.access, "zeri", locale),
    getTranslations("feed"),
  ]);

  if (feed.units.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <CampusVoiceComposer allowed={meetsLevelTwo({ createdAt: user.createdAt, isVerified: user.isVerified })} />
        <EmptyState
          illustration="feed"
          title={tVoice("campusVoiceEmpty")}
          description={tVoice("hintCampusVoice")}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <CampusVoiceComposer allowed={meetsLevelTwo({ createdAt: user.createdAt, isVerified: user.isVerified })} />
      <p className="measure text-xs text-text-muted">{tVoice("hintCampusVoice")}</p>
      <FeedList units={feed.units} ad={null} interstitials={null} ownFaculty="" />
    </div>
  );
}
