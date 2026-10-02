import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PrintButton } from "@/components/jobs/print-button";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { levelFor, levelLabelKey } from "@/lib/xp";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cv");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

export default async function CvPage() {
  const [me, locale, t, tg, ti] = await Promise.all([
    requireUser(),
    getLocale(),
    getTranslations("cv"),
    getTranslations("gamification"),
    getTranslations("interest"),
  ]);

  const english = locale === "en";

  const [materials, acceptedAnswers, events, courses, badges] = await Promise.all([
    db.material.aggregate({
      where: { uploaderId: me.id, isHidden: false },
      _count: { id: true },
      _sum: { downloads: true },
    }),
    db.answer.count({ where: { authorId: me.id, question: { acceptedAnswerId: { not: null } } } }),
    db.rsvp.count({ where: { userId: me.id, status: "going" } }),
    db.course.findMany({
      where: { enrollments: { some: { userId: me.id } } },
      orderBy: [{ year: "asc" }, { name: "asc" }],
      select: { id: true, name: true, nameEn: true, code: true, ects: true, year: true },
    }),
    db.userBadge.findMany({
      where: { userId: me.id },
      take: 8,
      select: { id: true, badge: { select: { name: true, nameEn: true } } },
    }),
  ]);

  const level = levelFor(me.xpContribution + me.xpActivity);
  const empty = materials._count.id === 0 && acceptedAnswers === 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header className="no-print flex flex-wrap items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-text">{t("title")}</h1>
          <p className="measure text-sm text-text-muted">{t("subtitle")}</p>
        </div>
        <PrintButton />
      </header>

      <p className="no-print text-xs text-text-muted">{t("printHelp")}</p>

      <article className="print-page flex flex-col gap-6 rounded-lg border border-border bg-surface p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-1 border-b border-border pb-4">
          <h2 className="text-xl font-semibold tracking-tight text-text">{me.name}</h2>
          <p className="text-sm text-text-muted">
            {[
              me.university ? (english ? me.university.nameEn : me.university.name) : null,
              me.faculty ? (english ? me.faculty.nameEn : me.faculty.name) : null,
              me.year ? t("year", { year: me.year }) : null,
              me.city,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {me.bio ? <p className="measure mt-1 text-sm text-text">{me.bio}</p> : null}
        </div>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
            {t("education")}
          </h3>
          <ul className="flex flex-col gap-1">
            {courses.map((course) => (
              <li key={course.id} className="tabular flex flex-wrap items-baseline gap-2 text-sm">
                <span className="text-text">{english ? course.nameEn : course.name}</span>
                <span className="text-xs text-text-muted">
                  {course.code} · {course.ects} ECTS · {t("year", { year: course.year })}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
            {t("contribution")}
          </h3>
          {empty ? (
            <p className="measure text-sm text-text-muted">{t("empty")}</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm text-text">
              <li>
                {t("materialsLine", {
                  count: materials._count.id,
                  downloads: materials._sum.downloads ?? 0,
                })}
              </li>
              <li>{t("answersLine", { count: acceptedAnswers })}</li>
              <li>{t("levelLine", { level: tg(levelLabelKey(level.key)) })}</li>
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
            {t("activity")}
          </h3>
          <ul className="flex flex-col gap-1 text-sm text-text">
            <li>{t("eventsLine", { count: events })}</li>
            <li>
              {tg("streak")}: {me.dailyStreak}
            </li>
          </ul>
          {badges.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {badges.map((item) => (
                <Badge key={item.id} variant="neutral">
                  {english ? item.badge.nameEn : item.badge.name}
                </Badge>
              ))}
            </div>
          ) : null}
        </section>

        {me.interestList.length > 0 ? (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              {t("skills")}
            </h3>
            <p className="text-sm text-text">
              {me.interestList.map((interest) => ti(interest)).join(" · ")}
            </p>
          </section>
        ) : null}

        <footer className="flex flex-wrap items-center gap-2 border-t border-border pt-4 text-xs text-text-muted">
          <span>{formatDate(new Date(), locale)}</span>
          {!me.pro ? <span className="ml-auto">{t("watermark")}</span> : null}
        </footer>
      </article>

      {!me.pro ? <p className="no-print text-xs text-text-muted">{t("watermarkPro")}</p> : null}
    </div>
  );
}
