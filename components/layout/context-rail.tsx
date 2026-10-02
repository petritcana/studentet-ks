import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Calendar, FileText, HelpCircle, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PersonCard } from "@/components/social/person-card";
import { WeeklyCard } from "@/components/social/weekly-card";
import { LiveRoomsCard } from "@/components/voice/live-rooms-card";
import { AnnouncementBoard } from "./announcement-board";
import { SponsoredSlot } from "./sponsored-slot";
import { shouldSeeAds, type AccessUser } from "@/lib/access";
import { db } from "@/lib/db";
import { formatDateShort, formatTime } from "@/lib/format";
import { getSuggestedPeople } from "@/lib/suggestions";
import { isAdmin } from "@/lib/permissions";

export type RailPage = "home" | "explore" | "materials" | "questions" | "career" | "community";

type RailUser = {
  id: string;
  facultyId: string | null;
  universityId: string | null;
  year: number | null;
  city: string | null;
  courseIds: string[];
  access: AccessUser;
  pro: boolean;
};

/** Shtylla e djathtë: njerëzit. Njoftimet, reklama dhe punët rrinë majtas. */
export async function ContextRail({ page, user }: { page: RailPage; user: RailUser }) {
  const home = page === "home";

  return (
    <>
      {/*
        Rendi është i qëllimshëm: së pari njoftimet dhe organizimet tona, sepse
        ato janë zëri i platformës, pastaj një reklamë, pastaj gjithçka tjetër.
      */}
      <AnnouncementBoard facultyId={user.facultyId} canEdit={isAdmin(user.access)} />
      {shouldSeeAds(user.access) ? <SponsoredSlot userId={user.id} /> : null}

      <ContextualSlot page={page} user={user} />
      {home ? (
        <LiveRoomsCard
          user={{ ...user.access, facultyId: user.facultyId, universityId: user.universityId }}
        />
      ) : null}
      {home ? <WeeklyCard user={{ access: user.access }} /> : null}
    </>
  );
}

async function ContextualSlot({ page, user }: { page: RailPage; user: RailUser }) {
  const locale = await getLocale();

  if (page === "materials") return <TopMaterials locale={locale} courseIds={user.courseIds} />;
  if (page === "questions") return <OpenQuestions locale={locale} courseIds={user.courseIds} />;
  if (page === "career") return <SavedJobsHint />;
  if (page === "community" || page === "explore") return <UpcomingEvents facultyId={user.facultyId} />;
  // Te ballina, njerëzit e gjeneratës rrinë në krye të feed-it; këtu do të ishin dy herë.
  if (page === "home") return null;

  return <PeopleFromYourYear userId={user.id} locale={locale} />;
}

async function PeopleFromYourYear({ userId, locale }: { userId: string; locale: string }) {
  const [people, t] = await Promise.all([
    getSuggestedPeople(userId, 4, { locale }),
    getTranslations("social"),
  ]);
  if (people.length === 0) return null;

  return (
    <Card className="flex flex-col gap-3 p-5">
      <p className="flex items-center gap-2 text-sm font-semibold text-text">
        <Users className="size-4 text-brand-500" />
        {t("suggested")}
      </p>
      <p className="text-xs text-text-muted">{t("suggestedNote")}</p>

      <div className="grid grid-cols-2 gap-2">
        {people.map((person) => (
          <PersonCard key={person.id} person={person} tile />
        ))}
      </div>

      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/komuniteti">
          {t("circles")}
          <ArrowRight />
        </Link>
      </Button>
    </Card>
  );
}

async function UpcomingEvents({ facultyId }: { facultyId: string | null }) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("campus")]);

  const events = await db.event.findMany({
    where: { date: { gte: new Date() }, facultyId: facultyId ?? undefined },
    orderBy: { date: "asc" },
    take: 3,
    select: { id: true, title: true, date: true, _count: { select: { rsvps: true } } },
  });
  if (events.length === 0) return null;

  return (
    <Card className="flex flex-col gap-3 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-text">
        <Calendar className="size-4 text-brand-500" />
        {t("tabEvents")}
      </p>

      <ul className="flex flex-col gap-2">
        {events.map((event) => (
          <li key={event.id}>
            <Link
              href={`/eventet/${event.id}`}
              className="flex items-center gap-3 rounded-sm px-1 py-1 transition-colors hover:bg-surface-2"
            >
              <span className="tabular flex w-12 shrink-0 flex-col text-center text-xs text-text-muted">
                <span>{formatDateShort(event.date, locale)}</span>
                <span>{formatTime(event.date)}</span>
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-text">{event.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

async function TopMaterials({ locale, courseIds }: { locale: string; courseIds: string[] }) {
  const english = locale === "en";
  const t = await getTranslations("material");

  const materials = await db.material.findMany({
    where: { courseId: { in: courseIds }, isHidden: false },
    orderBy: [{ rating: "desc" }, { downloads: "desc" }],
    take: 4,
    select: {
      id: true,
      title: true,
      rating: true,
      course: { select: { name: true, nameEn: true } },
    },
  });
  if (materials.length === 0) return null;

  return (
    <Card className="flex flex-col gap-3 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-text">
        <FileText className="size-4 text-brand-500" />
        {t("verifiedFirst")}
      </p>

      <ul className="flex flex-col gap-2">
        {materials.map((material) => (
          <li key={material.id}>
            <Link
              href={`/materialet/${material.id}`}
              className="flex flex-col gap-0.5 rounded-sm px-1 py-1 transition-colors hover:bg-surface-2"
            >
              <span className="truncate text-sm text-text">{material.title}</span>
              <span className="tabular text-xs text-text-muted">
                {english ? material.course.nameEn : material.course.name}
                {material.rating > 0 ? ` · ${material.rating.toFixed(1)}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

async function OpenQuestions({ locale, courseIds }: { locale: string; courseIds: string[] }) {
  const english = locale === "en";
  const t = await getTranslations("question");

  const questions = await db.question.findMany({
    where: { courseId: { in: courseIds }, acceptedAnswerId: null, isHidden: false },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: {
      id: true,
      title: true,
      course: { select: { name: true, nameEn: true } },
      _count: { select: { answers: true } },
    },
  });
  if (questions.length === 0) return null;

  return (
    <Card className="flex flex-col gap-3 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-text">
        <HelpCircle className="size-4 text-brand-500" />
        {t("unanswered")}
      </p>

      <ul className="flex flex-col gap-2">
        {questions.map((question) => (
          <li key={question.id}>
            <Link
              href={`/pyetje/${question.id}`}
              className="flex flex-col gap-0.5 rounded-sm px-1 py-1 transition-colors hover:bg-surface-2"
            >
              <span className="line-clamp-2 text-sm text-text">{question.title}</span>
              <span className="tabular text-xs text-text-muted">
                {english ? question.course.nameEn : question.course.name} ·{" "}
                {t("answersCount", { count: question._count.answers })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

async function SavedJobsHint() {
  const t = await getTranslations("career");

  return (
    <Card className="flex flex-col gap-2 p-4">
      <p className="text-sm font-semibold text-text">{t("recommended")}</p>
      <p className="text-xs text-text-muted">{t("subtitle")}</p>
      <Badge variant="brand" className="w-fit">
        {t("tabApplications")}
      </Badge>
    </Card>
  );
}
