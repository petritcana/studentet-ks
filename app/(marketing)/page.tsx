import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  FileText,
  MessageCircleQuestion,
  Search,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { facultyTheme } from "@/lib/faculties";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

const VALUE_PROPS = [
  {
    icon: CalendarDays,
    title: "Orari yt, i gatshëm",
    body: "Zgjedh lëndët një herë. Orari, afatet e provimeve dhe njoftimet para ligjëratës vijnë vetë.",
  },
  {
    icon: FileText,
    title: "Materialet nuk humbin më",
    body: "Skripta, shënime dhe provime të kaluara, të lidhura me lëndën. Jo folderë Drive që zhduken me gjeneratën.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Pyet ata që e kanë kaluar",
    body: "Pyetja pa përgjigje shkon te studentët që e kanë marrë atë provim. Kështu lidhen vitet mes vete.",
  },
  {
    icon: Users,
    title: "Njerëz me arsye, jo profile bosh",
    body: "Çdo sugjerim vjen me arsyen: tri lëndë të përbashkëta, pesë shokë, i njëjti qytet.",
  },
];

const STEPS = [
  { title: "Zgjedh fakultetin dhe vitin", body: "Dy klikime. Pa formularë të gjatë." },
  { title: "Konfirmo lëndët e semestrit", body: "Janë të parazgjedhura nga programi yt." },
  { title: "Ndiq gjeneratën tënde", body: "Dymbëdhjetë profile të renditura sipas afërsisë reale." },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user?.onboardedAt) redirect("/feed");

  const [studentCount, materialCount, facultyCount, questionCount, faculties, recent] =
    await Promise.all([
      db.user.count({ where: { onboardedAt: { not: null } } }),
      db.material.count({ where: { isHidden: false } }),
      db.faculty.count(),
      db.question.count(),
      db.faculty.findMany({
        where: { university: { abbr: "UP" } },
        select: { id: true, name: true, color: true, _count: { select: { users: true } } },
        take: 6,
      }),
      db.user.findMany({
        where: { onboardedAt: { not: null } },
        select: { name: true, avatar: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

  const stats = [
    { value: formatNumber(studentCount), label: "studentë" },
    { value: formatNumber(materialCount), label: "materiale" },
    { value: formatNumber(facultyCount), label: "fakultete" },
    { value: formatNumber(questionCount), label: "pyetje" },
  ];

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <BrandLogo />
          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            <Button asChild variant="ghost" size="sm">
              <Link href="/hyr">Hyr</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/regjistrohu">Regjistrohu</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="permbajtja">
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-x-0 -top-40 h-96 bg-brand-500/10 blur-3xl"
            aria-hidden
          />
          <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:gap-16 lg:py-24">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
              <Badge variant="brand" className="w-fit">
                Për studentët e Kosovës
              </Badge>

              <h1 className="font-serif text-hero text-text">
                Gjithçka që të duhet për fakultetin. Në një vend.
              </h1>

              <p className="measure text-lg text-text-muted">
                Mësim që të lidh, lidhje që të mëson. Orari, materialet, pyetjet dhe njerëzit e
                gjeneratës sate, pa u shpërndarë nëpër grupe WhatsApp dhe folderë që humbin çdo
                vit.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/regjistrohu">
                    Hyr me email studentor
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/hyr">Kam llogari</Link>
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <AvatarStack people={recent} size="sm" max={5} />
                <p className="text-sm text-text-muted">
                  <span className="tabular font-medium text-text">
                    {formatNumber(studentCount)} studentë
                  </span>{" "}
                  nga {facultyCount} fakultete janë brenda
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 lg:max-w-md">
              <Card className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Sot te ti
                </p>
                <div className="mt-3 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-md bg-faculty-economics/12 text-faculty-economics">
                      <CalendarDays className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">
                        Statistikë, 10:00
                      </p>
                      <p className="truncate text-xs text-text-muted">Salla 4, Ekonomiku</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-md bg-faculty-medicine/12 text-faculty-medicine">
                      <FileText className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">
                        8 materiale të reja
                      </p>
                      <p className="truncate text-xs text-text-muted">
                        Për lëndët e tua këtë javë
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-md bg-faculty-science/12 text-faculty-science">
                      <MessageCircleQuestion className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">
                        3 pyetje presin përgjigje
                      </p>
                      <p className="truncate text-xs text-text-muted">
                        Nga gjenerata jote, lëndë që i ke kaluar
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="flex items-center gap-3 p-4">
                <Search className="size-4 shrink-0 text-text-muted" />
                <p className="truncate text-sm text-text-muted">
                  Kërko: njerëz, lëndë, materiale, evente, punë
                </p>
              </Card>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1">
                <span className="tabular text-2xl font-semibold text-text">{stat.value}</span>
                <span className="text-sm text-text-muted">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="font-serif text-2xl text-text">Çfarë merr në 60 sekondat e para</h2>
          <p className="measure mt-2 text-sm text-text-muted">
            Edhe pa asnjë shok. Vlera vjen para rrjetit, jo pas tij.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {VALUE_PROPS.map((prop) => (
              <Card key={prop.title} className="flex flex-col gap-3 p-5" interactive>
                <span className="grid size-10 w-fit place-items-center rounded-md bg-brand-500/12 text-brand-500">
                  <prop.icon className="size-5" />
                </span>
                <h3 className="text-base font-semibold text-text">{prop.title}</h3>
                <p className="text-sm text-text-muted">{prop.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <h2 className="font-serif text-2xl text-text">Fakultetet që janë brenda</h2>
            <p className="measure mt-2 text-sm text-text-muted">
              Çdo fakultet ka ngjyrën e vet, kanalet e veta dhe bibliotekën e vet.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {faculties.map((faculty) => {
                const theme = facultyTheme(faculty.color);
                return (
                  <div
                    key={faculty.id}
                    className={`flex items-center gap-3 rounded-lg border bg-linear-to-br p-4 ${theme.border} ${theme.gradient}`}
                  >
                    <span className={`size-3 shrink-0 rounded-full ${theme.dot}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-semibold ${theme.text}`}>
                        {theme.shortLabel}
                      </p>
                      <p className="truncate text-xs text-text-muted">{faculty.name}</p>
                    </div>
                    <span className="tabular shrink-0 text-xs text-text-muted">
                      {faculty._count.users}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 className="font-serif text-2xl text-text">Tri hapa dhe je brenda</h2>
          <ol className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5">
                <span className="tabular grid size-8 place-items-center rounded-full bg-brand-500/12 text-sm font-semibold text-brand-500">
                  {index + 1}
                </span>
                <h3 className="text-base font-semibold text-text">{step.title}</h3>
                <p className="text-sm text-text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t border-border bg-surface">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-20">
            <div className="flex flex-col gap-2">
              <h2 className="font-serif text-2xl text-text">
                Shënimet e tua do t&apos;i lexojnë edhe pas teje
              </h2>
              <p className="measure text-sm text-text-muted">
                Nëse i mban shënimet mirë, këtu ato nuk humbin me mbarimin e semestrit. Dhe emri
                yt qëndron mbi to.
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/regjistrohu">
                Nis tani
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo />
          </div>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-muted">
            <Link href="/privatesia" className="hover:text-text">
              Privatësia
            </Link>
            <Link href="/kushtet" className="hover:text-text">
              Kushtet e përdorimit
            </Link>
            <Link href="/moderimi/publik" className="hover:text-text">
              Raporti i moderimit
            </Link>
            <Link href="/design-system" className="hover:text-text">
              Sistemi i dizajnit
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
        <p className="mx-auto max-w-6xl px-4 pb-8 text-xs text-text-muted sm:px-6">
          Platforma respekton Ligjin Nr. 06/L-082 për Mbrojtjen e të Dhënave Personale. Mosha
          minimale është 16 vjeç.
        </p>
      </footer>
    </div>
  );
}
