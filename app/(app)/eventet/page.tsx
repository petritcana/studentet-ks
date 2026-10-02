import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { SegmentedNav } from "@/components/shared/segmented-nav";
import { EventCard } from "@/components/campus/event-card";
import { getEvents } from "@/lib/queries/campus";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("campus");
  return { title: t("tabEvents") };
}

export const dynamic = "force-dynamic";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [me, params, t, te] = await Promise.all([
    requireUser(),
    searchParams,
    getTranslations("campus"),
    getTranslations("empty"),
  ]);

  const past = params.tab === "kaluara";
  const events = await getEvents(me, { past, limit: 30 });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-text">{t("tabEvents")}</h1>
        <Button asChild size="sm" className="ml-auto">
          <Link href="/eventet/krijo">
            <CalendarPlus />
            {t("createEvent")}
          </Link>
        </Button>
      </header>

      <SegmentedNav
        base="/eventet"
        active={past ? "kaluara" : "ardhshme"}
        items={[
          { value: "ardhshme", label: t("tabEvents") },
          { value: "kaluara", label: t("eventPast") },
        ]}
      />

      {events.length === 0 ? (
        <EmptyState
          illustration="calendar"
          title={te("schedule.title")}
          description={t("noEvents")}
          action={
            <Button asChild size="sm">
              <Link href="/eventet/krijo">{t("createEvent")}</Link>
            </Button>
          }
        />
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
