import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { TeamEventForm } from "@/components/admin/team-event-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { teamEvents } from "@/lib/competition/team-events";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("competition");
  return { title: t("adminTitle"), robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/** Admini hap garat e përkohshme mes dy universiteteve. */
export default async function AdminCompetitionPage() {
  const [, t, tAdmin] = await Promise.all([requireAdmin(), getTranslations("competition"), getTranslations("admin")]);
  const [universities, events] = await Promise.all([
    db.university.findMany({ where: { active: true }, orderBy: { abbr: "asc" }, select: { id: true, abbr: true, name: true } }),
    teamEvents({ take: 20 }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <Link href="/admin" className="inline-flex w-fit items-center gap-1.5 text-sm text-text-muted hover:text-text">
        <ArrowLeft className="size-4" />
        {tAdmin("title")}
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text">{t("adminTitle")}</h1>
        <p className="measure text-sm text-text-muted">{t("adminSubtitle")}</p>
      </header>
      <Card className="p-5">
        <TeamEventForm universities={universities} />
      </Card>
      <ul className="flex flex-col gap-2">
        {events.map((event) => (
          <li key={event.id}>
            <Link href={`/gara/ngjarje/${event.id}`}>
              <Card className="flex items-center gap-3 p-3">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">{event.title}</span>
                {event.active ? <Badge variant="success">{t("eventLive")}</Badge> : null}
                <span className="tabular text-sm text-text">
                  {event.universityA.abbr} {event.scoreA} : {event.scoreB} {event.universityB.abbr}
                </span>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
