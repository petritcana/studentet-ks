import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  FileText,
  MessageCircleQuestion,
  Sparkles,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/layout/brand";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isDemoMode } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { facultyStyle } from "@/lib/faculties";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user?.onboardedAt) redirect("/feed");

  const [t, tm, tp, tl, locale] = await Promise.all([
    getTranslations("landing"),
    getTranslations("meta"),
    getTranslations("pro"),
    getTranslations("legal"),
    getLocale(),
  ]);
  const english = locale === "en";

  const [students, materials, facultyCount, questions, faculties, recent] = await Promise.all([
    db.user.count({ where: { onboardedAt: { not: null } } }),
    db.material.count({ where: { isHidden: false } }),
    db.faculty.count(),
    db.question.count(),
    db.faculty.findMany({
      where: { university: { abbr: "UP" } },
      select: {
        id: true,
        name: true,
        nameEn: true,
        abbr: true,
        color: true,
        _count: { select: { users: true } },
      },
      orderBy: { users: { _count: "desc" } },
      take: 8,
    }),
    db.user.findMany({
      where: { onboardedAt: { not: null } },
      select: { name: true, avatar: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const format = new Intl.NumberFormat(english ? "en-GB" : "sq-AL");

  const values = [
    { icon: CalendarDays, title: t("v1"), body: t("v1b") },
    { icon: FileText, title: t("v2"), body: t("v2b") },
    { icon: MessageCircleQuestion, title: t("v3"), body: t("v3b") },
    { icon: Bot, title: t("v4"), body: t("v4b") },
  ];

  const steps = [
    { title: t("s1"), body: t("s1b") },
    { title: t("s2"), body: t("s2b") },
    { title: t("s3"), body: t("s3b") },
  ];

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <BrandLogo label={tm("name")} ariaLabel={tm("homeLink")} />
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle className="hidden sm:inline-flex" />
            <Button asChild variant="ghost" size="sm">
              <Link href="/hyr">{t("ctaSecondary")}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/regjistrohu">{t("cta")}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="permbajtja">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 -top-40 h-96 bg-brand-500/10 blur-3xl" aria-hidden />
          <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:gap-16 lg:py-24">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
              <Badge variant="brand" className="w-fit">
                {t("badge")}
              </Badge>
              <h1 className="font-serif text-hero text-text">{t("hero")}</h1>
              <p className="measure text-lg text-text-muted">{t("sub")}</p>

              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/regjistrohu">
                    {t("cta")}
                    <ArrowRight />
                  </Link>
                </Button>
                {isDemoMode ? (
                  <Button asChild variant="outline" size="lg">
                    <Link href="/demo">{t("demoCta")}</Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline" size="lg">
                    <Link href="/hyr">{t("ctaSecondary")}</Link>
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <AvatarStack people={recent} size="sm" max={5} />
                <p className="text-sm text-text-muted">
                  {t("proof", { count: format.format(students), faculties: facultyCount })}
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 lg:max-w-md">
              <Card className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  {t("valueTitle")}
                </p>
                <div className="mt-3 flex flex-col gap-3">
                  {values.slice(0, 3).map((value) => (
                    <div key={value.title} className="flex items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-500/12 text-brand-500">
                        <value.icon className="size-5" />
                      </span>
                      <p className="min-w-0 truncate text-sm font-medium text-text">{value.title}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="pro-gradient p-4 text-pro-contrast">
                <p className="text-sm font-semibold">{t("proTitle")}</p>
                <p className="mt-1 text-xs opacity-90">{tp("earnBanner")}</p>
              </Card>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4">
            {[
              { value: students, label: t("statsStudents") },
              { value: materials, label: t("statsMaterials") },
              { value: facultyCount, label: t("statsFaculties") },
              { value: questions, label: t("statsQuestions") },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1">
                <span className="tabular text-2xl font-semibold text-text">
                  {format.format(stat.value)}
                </span>
                <span className="text-sm text-text-muted">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="font-serif text-2xl text-text">{t("valueTitle")}</h2>
          <p className="measure mt-2 text-sm text-text-muted">{t("valueBody")}</p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {values.map((value) => (
              <Card key={value.title} interactive className="flex flex-col gap-3 p-5">
                <span className="grid size-10 w-fit place-items-center rounded-md bg-brand-500/12 text-brand-500">
                  <value.icon className="size-5" />
                </span>
                <h3 className="text-base font-semibold text-text">{value.title}</h3>
                <p className="text-sm text-text-muted">{value.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-16 sm:px-6 lg:py-20">
            <div className="flex flex-col gap-2">
              <Badge variant="brand" className="w-fit">
                <Sparkles />
                {tp("name")}
              </Badge>
              <h2 className="font-serif text-2xl text-text">{t("proTitle")}</h2>
              <p className="measure text-sm text-text-muted">{t("proBody")}</p>
            </div>

            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[t("proPoint1"), t("proPoint2"), t("proPoint3")].map((point) => (
                <li key={point} className="flex items-start gap-2.5 rounded-md border border-border bg-bg p-4">
                  <Check className="mt-0.5 size-4 shrink-0 text-success-text" />
                  <span className="text-sm text-text">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="font-serif text-2xl text-text">{t("facultiesTitle")}</h2>
          <p className="measure mt-2 text-sm text-text-muted">{t("facultiesBody")}</p>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {faculties.map((faculty) => (
              <div
                key={faculty.id}
                style={facultyStyle(faculty.color)}
                className="flex items-center gap-3 rounded-lg border border-faculty/30 bg-faculty/10 p-4"
              >
                <span className="size-3 shrink-0 rounded-full bg-faculty" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-faculty-text">{faculty.abbr}</p>
                  <p className="truncate text-xs text-text-muted">
                    {english ? faculty.nameEn : faculty.name}
                  </p>
                </div>
                <span className="tabular shrink-0 text-xs text-text-muted">
                  {faculty._count.users}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <h2 className="font-serif text-2xl text-text">{t("stepsTitle")}</h2>
            <ol className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {steps.map((step, index) => (
                <li key={step.title} className="flex flex-col gap-2 rounded-lg border border-border bg-bg p-5">
                  <span className="tabular grid size-8 place-items-center rounded-full bg-brand-500/12 text-sm font-semibold text-brand-500">
                    {index + 1}
                  </span>
                  <h3 className="text-base font-semibold text-text">{step.title}</h3>
                  <p className="text-sm text-text-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-20">
          <div className="flex flex-col gap-2">
            <h2 className="font-serif text-2xl text-text">{t("closingTitle")}</h2>
            <p className="measure text-sm text-text-muted">{t("closingBody")}</p>
          </div>
          <Button asChild size="lg">
            <Link href="/regjistrohu">
              {t("closingCta")}
              <ArrowRight />
            </Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
          <BrandLogo label={tm("name")} ariaLabel={tm("homeLink")} />
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-muted">
            <Link href="/ligjore/privatesia" className="hover:text-text">
              {tl("privacy")}
            </Link>
            <Link href="/ligjore/kushtet" className="hover:text-text">
              {tl("terms")}
            </Link>
            <Link href="/moderimi/publik" className="hover:text-text">
              {tl("moderation")}
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Users className="size-4 text-text-muted" />
            <span className="tabular text-xs text-text-muted">{format.format(students)}</span>
          </div>
        </div>
        <p className="mx-auto max-w-6xl px-4 pb-8 text-xs text-text-muted sm:px-6">
          {t("footerLegal")}
        </p>
      </footer>
    </div>
  );
}
