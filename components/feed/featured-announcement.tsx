import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Bus, CalendarDays, Clock, MapPin, Megaphone, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MediaImage } from "@/components/ui/media-image";
import { BrandGlyph } from "@/components/layout/brand";
import { IMPORTANT_PRIORITY, isAnnouncementKind, type AnnouncementKind } from "@/lib/announcements";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/format";

const KIND_ICON: Record<AnnouncementKind, typeof Megaphone> = {
  notice: Megaphone,
  event: CalendarDays,
  trip: Bus,
  meetup: Users,
};

/**
 * Njoftimi i veçuar te ballina.
 *
 * Një njoftim zyrtar nuk duhet të lexohet si postim i dikujt: ka logon e
 * burimit, titull, afat dhe një veprim të vetëm. Prandaj karta e tij ka formë
 * tjetër nga `PostCard`, jo thjesht një etiketë mbi të njëjtën kartë.
 *
 * Del vetëm njoftimi më i rëndësishëm i çastit. Dy a tri karta të tilla mbi
 * postimin e parë do ta kthenin ballinën në tabelë shpalljesh.
 */
export async function FeaturedAnnouncement({ facultyId }: { facultyId: string | null }) {
  const now = new Date();

  const announcement = await db.announcement.findFirst({
    where: {
      isActive: true,
      priority: { gte: IMPORTANT_PRIORITY },
      startsAt: { lte: now },
      AND: [
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        facultyId ? { OR: [{ facultyId: null }, { facultyId }] } : { facultyId: null },
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
      faculty: { select: { name: true, nameEn: true, abbr: true } },
    },
  });

  if (!announcement) return null;

  const [t, locale] = await Promise.all([getTranslations("announcements"), getLocale()]);
  const english = locale === "en";

  const kind: AnnouncementKind = isAnnouncementKind(announcement.kind) ? announcement.kind : "notice";
  const Icon = KIND_ICON[kind];
  const title = english ? announcement.titleEn : announcement.title;
  const body = english ? announcement.bodyEn : announcement.body;
  const source = announcement.faculty
    ? english
      ? announcement.faculty.nameEn
      : announcement.faculty.name
    : "Studentët.KS";

  return (
    <Card
      data-featured-announcement
      className="flex flex-col overflow-hidden border-brand-500/30 bg-gradient-to-br from-brand-500/8 via-surface to-surface p-0"
    >
      {announcement.image ? (
        <div className="relative aspect-[16/6] w-full overflow-hidden bg-surface-2">
          <MediaImage src={announcement.image} alt="" fill className="object-cover" />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand-500/12 text-brand-500">
            {announcement.faculty ? (
              <span className="text-[10px] font-semibold">{announcement.faculty.abbr}</span>
            ) : (
              <BrandGlyph className="size-4" />
            )}
          </span>
          <span className="truncate text-xs font-medium text-text-muted">{source}</span>
          <Badge variant="brand">
            <Icon className="size-3" />
            {t(`kind_${kind}`)}
          </Badge>
        </div>

        <div className="flex flex-col gap-1.5">
          <h2 className="text-balance font-serif text-lg leading-tight text-text">{title}</h2>
          <p className="measure line-clamp-3 text-sm text-text-muted">{body}</p>
        </div>

        {announcement.eventAt || announcement.place || announcement.deadline ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
            {announcement.eventAt ? (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                {formatDateTime(announcement.eventAt.toISOString(), locale)}
              </span>
            ) : null}
            {announcement.place ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                {announcement.place}
              </span>
            ) : null}
            {announcement.deadline ? (
              <span className="inline-flex items-center gap-1.5 text-warning-text">
                <Clock className="size-3.5" />
                {t("deadline", { date: formatDate(announcement.deadline.toISOString(), locale) })}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button asChild size="sm">
            <Link href="/njoftimet-zyrtare">
              {t("viewDetails")}
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
