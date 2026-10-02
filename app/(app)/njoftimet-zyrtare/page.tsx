import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Bus, CalendarDays, Clock, MapPin, Megaphone, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { MediaImage } from "@/components/ui/media-image";
import { IMPORTANT_PRIORITY, isAnnouncementKind, type AnnouncementKind } from "@/lib/announcements";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";
import { requireUser } from "@/lib/session";

const KIND_ICON: Record<AnnouncementKind, typeof Megaphone> = {
  notice: Megaphone,
  event: CalendarDays,
  trip: Bus,
  meetup: Users,
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("announcements");
  return { title: t("title"), description: t("subtitle") };
}

/**
 * Të gjitha njoftimet zyrtare.
 *
 * Shtylla tregon katër; këtu rrinë të tëra, që një afat i humbur të mos jetë
 * kurrë justifikim. Rendi është i njëjti: më e rëndësishmja e para.
 */
export default async function AnnouncementsPage() {
  const me = await requireUser();
  const [t, locale] = await Promise.all([getTranslations("announcements"), getLocale()]);
  const english = locale === "en";
  const now = new Date();

  const announcements = await db.announcement.findMany({
    where: {
      isActive: true,
      startsAt: { lte: now },
      AND: [
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        me.facultyId ? { OR: [{ facultyId: null }, { facultyId: me.facultyId }] } : { facultyId: null },
      ],
    },
    orderBy: [{ priority: "desc" }, { eventAt: "asc" }, { startsAt: "desc" }],
    select: {
      id: true,
      kind: true,
      title: true,
      titleEn: true,
      body: true,
      bodyEn: true,
      url: true,
      image: true,
      eventAt: true,
      place: true,
      deadline: true,
      priority: true,
      faculty: { select: { name: true, nameEn: true } },
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl text-text">{t("title")}</h1>
        <p className="measure text-sm text-text-muted">{t("subtitle")}</p>
      </header>

      {announcements.length === 0 ? (
        <EmptyState illustration="bell" title={t("empty")} description={t("subtitle")} />
      ) : (
        <ul className="flex flex-col gap-3">
          {announcements.map((item) => {
            const kind: AnnouncementKind = isAnnouncementKind(item.kind) ? item.kind : "notice";
            const Icon = KIND_ICON[kind];

            return (
              <li key={item.id}>
                <Card className="flex flex-col overflow-hidden p-0">
                  {item.image ? (
                    <div className="relative aspect-[16/6] w-full overflow-hidden bg-surface-2">
                      <MediaImage src={item.image} alt="" fill className="object-cover" />
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={item.priority >= IMPORTANT_PRIORITY ? "brand" : "neutral"}>
                        <Icon className="size-3" />
                        {t(`kind_${kind}`)}
                      </Badge>
                      <span className="truncate text-xs text-text-muted">
                        {item.faculty
                          ? english
                            ? item.faculty.nameEn
                            : item.faculty.name
                          : t("sourcePlatform")}
                      </span>
                      {item.priority >= IMPORTANT_PRIORITY ? (
                        <Badge variant="danger">{t("important")}</Badge>
                      ) : null}
                    </div>

                    <h2 className="text-balance text-base font-semibold text-text">
                      {english ? item.titleEn : item.title}
                    </h2>
                    <p className="measure text-sm text-text-muted">
                      {english ? item.bodyEn : item.body}
                    </p>

                    {item.eventAt || item.place || item.deadline ? (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                        {item.eventAt ? (
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="size-3.5" />
                            {formatDateTime(item.eventAt.toISOString(), locale)}
                          </span>
                        ) : null}
                        {item.place ? (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="size-3.5" />
                            {item.place}
                          </span>
                        ) : null}
                        {item.deadline ? (
                          <span className="inline-flex items-center gap-1.5 text-warning-text">
                            <Clock className="size-3.5" />
                            {t("deadline", { date: formatDate(item.deadline.toISOString(), locale) })}
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    {item.url ? (
                      <Button asChild size="sm" variant="secondary" className="mt-1 self-start">
                        <a href={item.url} target="_blank" rel="noreferrer">
                          {t("open")}
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
