import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Raporti i moderimit",
  description:
    "Historiku publik i moderimit, i agreguar. Sa përmbajtje u hoq dhe sa u shqyrtua çdo javë.",
};

export const dynamic = "force-dynamic";

export default async function PublicModerationPage() {
  const [logs, totals] = await Promise.all([
    db.moderationLog.findMany({ orderBy: { weekOf: "desc" }, take: 12 }),
    Promise.all([
      db.report.count(),
      db.report.count({ where: { status: "actioned" } }),
      db.report.count({ where: { status: { in: ["open", "reviewing"] } } }),
    ]),
  ]);

  const [allReports, actioned, pending] = totals;

  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <BrandLogo />
          <ThemeToggle />
        </div>
      </header>

      <main id="permbajtja" className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-2">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-muted">
            <ShieldCheck className="size-3.5 text-brand-500" />
            Transparencë
          </span>
          <h1 className="font-serif text-2xl text-text">Raporti i moderimit</h1>
          <p className="measure text-sm text-text-muted">
            Publikojmë sa përmbajtje hiqet dhe sa raportime shqyrtohen, të agreguara. Asnjë emër,
            asnjë detaj që identifikon dikë. Koha e premtuar e reagimit është 24 orë.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="flex flex-col gap-1 p-4">
            <span className="tabular text-2xl font-semibold text-text">{allReports}</span>
            <span className="text-sm text-text-muted">raportime gjithsej</span>
          </Card>
          <Card className="flex flex-col gap-1 p-4">
            <span className="tabular text-2xl font-semibold text-text">{actioned}</span>
            <span className="text-sm text-text-muted">me masë</span>
          </Card>
          <Card className="flex flex-col gap-1 p-4">
            <span className="tabular text-2xl font-semibold text-text">{pending}</span>
            <span className="text-sm text-text-muted">në pritje</span>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Java
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Të hequra
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Të shqyrtuara
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Pa masë
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 text-text">{formatDate(log.weekOf)}</td>
                  <td className="tabular px-4 py-2.5 text-text">{log.removed}</td>
                  <td className="tabular px-4 py-2.5 text-text-muted">{log.reviewed}</td>
                  <td className="tabular px-4 py-2.5 text-text-muted">{log.dismissed}</td>
                </tr>
              ))}
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-text-muted">
                    Ende s&apos;ka javë të regjistruar.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>

        <div className="flex flex-col gap-3">
          <h2 className="font-serif text-xl text-text">Çfarë hiqet</h2>
          <ul className="measure flex flex-col gap-2 text-sm text-text-muted">
            <li>Ngacmimi dhe sulmet ndaj personave të veçantë.</li>
            <li>Gjuha e urrejtjes mbi baza etnike, fetare, gjinore ose të tjera.</li>
            <li>Përmendja e emrave në Zërin e kampusit, ku anonimiteti është i dyanshëm.</li>
            <li>Përmbajtja seksuale dhe kërcënimet.</li>
            <li>Të dhënat personale: numra telefoni, adresa, dokumente.</li>
            <li>Librat e plotë me të drejta autoriale.</li>
          </ul>
          <p className="measure text-sm text-text-muted">
            Tri raportime e fshehin automatikisht një përmbajtje derisa ta shikojë një moderator.
            Kjo nuk është vendim përfundimtar dhe kthehet nëse raportimi ishte i pabazë.
          </p>
        </div>

        <p className="text-sm text-text-muted">
          Lexo edhe{" "}
          <Link href="/privatesia" className="text-brand-500 hover:underline">
            politikën e privatësisë
          </Link>{" "}
          dhe{" "}
          <Link href="/kushtet" className="text-brand-500 hover:underline">
            kushtet e përdorimit
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
