import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { AnnouncementForm } from "@/components/admin/announcement-form";
import { AnnouncementToggle } from "@/components/admin/announcement-toggle";
import { DeleteAnnouncementButton, EditAnnouncementButton } from "@/components/admin/announcement-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { IMPORTANT_PRIORITY, isAnnouncementKind } from "@/lib/announcements";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminAnnouncements");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ ndrysho?: string }>;
}) {
  const [, locale, t, ta, tAdmin, params] = await Promise.all([
    requireAdmin(),
    getLocale(),
    getTranslations("adminAnnouncements"),
    getTranslations("announcements"),
    getTranslations("admin"),
    searchParams,
  ]);

  const items = await db.announcement.findMany({
    where: { facultyId: null },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      kind: true,
      title: true,
      titleEn: true,
      body: true,
      bodyEn: true,
      place: true,
      url: true,
      image: true,
      isActive: true,
      priority: true,
      eventAt: true,
      endsAt: true,
    },
  });
  const now = new Date();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <Link href="/admin" className="inline-flex w-fit items-center gap-1.5 text-sm text-text-muted hover:text-text">
        <ArrowLeft className="size-4" />
        {tAdmin("title")}
      </Link>

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text">{t("title")}</h1>
        <p className="measure text-sm text-text-muted">{t("subtitle")}</p>
      </header>

      <Card className="p-5">
        <AnnouncementForm />
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-text">{t("publishedList")}</h2>
        {items.length === 0 ? (
          <p className="text-sm text-text-muted">{ta("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) => {
              const expired = item.endsAt !== null && item.endsAt < now;
              return (
                <li key={item.id}>
                  <Card className="flex flex-wrap items-center gap-3 p-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="neutral">{ta(`kind_${isAnnouncementKind(item.kind) ? item.kind : "notice"}`)}</Badge>
                        {item.priority >= IMPORTANT_PRIORITY ? <Badge variant="warning">{ta("important")}</Badge> : null}
                        {!item.isActive || expired ? <Badge variant="neutral">{t("inactive")}</Badge> : null}
                      </div>
                      <p className="truncate text-sm font-medium text-text">{item.title}</p>
                      {item.eventAt ? (
                        <p className="tabular text-xs text-text-muted">{formatDate(item.eventAt, locale)}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <EditAnnouncementButton
                        autoOpen={params.ndrysho === item.id}
                        draft={{
                          id: item.id,
                          kind: isAnnouncementKind(item.kind) ? item.kind : "notice",
                          title: item.title,
                          titleEn: item.titleEn,
                          body: item.body,
                          bodyEn: item.bodyEn,
                          place: item.place,
                          url: item.url,
                          image: item.image,
                          eventAt: item.eventAt?.toISOString() ?? null,
                          endsAt: item.endsAt?.toISOString() ?? null,
                          important: item.priority >= IMPORTANT_PRIORITY,
                        }}
                      />
                      <AnnouncementToggle id={item.id} isActive={item.isActive} />
                      <DeleteAnnouncementButton id={item.id} />
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
