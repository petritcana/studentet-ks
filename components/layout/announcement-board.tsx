import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { IMPORTANT_PRIORITY, isAnnouncementKind, RAIL_ANNOUNCEMENTS } from "@/lib/announcements";
import { CACHE_TAGS, cachedBy } from "@/lib/cache";
import { db } from "@/lib/db";
import { formatDate, formatDateShort, formatTime } from "@/lib/format";
import { AnnouncementList, type AnnouncementView } from "./announcement-list";

/**
 * Hapësira jonë.
 *
 * Njoftimet, eventet, udhëtimet dhe takimet që i organizon Studentët.KS, plus
 * njoftimet e fakultetit të studentit. Rri e para në shtyllën e majtë.
 */
const loadAnnouncements = cachedBy(
  async (facultyId: string | null) => {
    const now = new Date();
    return db.announcement.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        // Dy kushte OR nuk rrinë dot krah për krah te i njëjti objekt, prandaj
        // bashkohen me AND: njëri për dritaren kohore, tjetri për burimin.
        AND: [
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          facultyId ? { OR: [{ facultyId: null }, { facultyId }] } : { facultyId: null },
        ],
      },
      orderBy: [{ priority: "desc" }, { eventAt: "asc" }, { startsAt: "desc" }],
      take: RAIL_ANNOUNCEMENTS,
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
  },
  ["njoftimet-e-shtylles"],
  { revalidate: 60, tags: [CACHE_TAGS.announcements] },
);

/** `canEdit`: admini sheh «Ndrysho» te karta dhe te çdo njoftim i platformës. */
export async function AnnouncementBoard({ facultyId, canEdit = false }: { facultyId: string | null; canEdit?: boolean }) {
  const [locale, t, announcements] = await Promise.all([
    getLocale(),
    getTranslations("announcements"),
    loadAnnouncements(facultyId),
  ]);
  const english = locale === "en";

  // Datat formatohen këtu, në orën e Kosovës: klienti merr tekst të gatshëm.
  const items: AnnouncementView[] = announcements.map((item) => {
    const kind = isAnnouncementKind(item.kind) ? item.kind : "notice";
    const tileDate = item.eventAt ?? item.deadline;
    const [day, month] = tileDate ? formatDateShort(tileDate, locale).split(" ") : [];
    return {
      id: item.id,
      kind,
      label: item.faculty ? (english ? item.faculty.nameEn : item.faculty.name) : t(`kind_${kind}`),
      important: item.priority >= IMPORTANT_PRIORITY,
      title: english ? item.titleEn : item.title,
      body: english ? item.bodyEn : item.body,
      tile: day && month ? { day, month } : null,
      when: item.eventAt ? `${formatDate(item.eventAt, locale)}, ${formatTime(item.eventAt)}` : null,
      place: item.place,
      deadline: item.deadline ? formatDate(item.deadline, locale) : null,
      url: item.url,
      image: item.image,
      // Njoftimet e fakulteteve nuk i ndryshon paneli i platformës.
      editHref: canEdit && !item.faculty ? `/admin/njoftimet?ndrysho=${item.id}` : null,
    };
  });

  return (
    <Card className="flex flex-col p-5" data-announcement-board>
      {/* Shtylla tregon katër; të tërat rrinë te faqja, që afati të mos humbasë. */}
      <div className="mb-1 flex items-center justify-between gap-2">
        {items.length > 0 ? (
          <Link href="/njoftimet-zyrtare" className="w-max font-display text-[12px] font-bold uppercase tracking-[0.14em] text-brand-word transition-opacity hover:opacity-80">
            {t("title")}
          </Link>
        ) : (
          <span />
        )}
        {/* Admini i ndryshon njoftimet, eventet dhe udhëtimet tona drejt nga këtu. */}
        {canEdit ? (
          <Link
            href="/admin/njoftimet"
            className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-text-muted hover:text-text"
            data-announcement-admin
          >
            <Pencil className="size-3" aria-hidden />
            {t("manage")}
          </Link>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-text-muted">{t("empty")}</p>
      ) : (
        <AnnouncementList items={items} />
      )}
    </Card>
  );
}
