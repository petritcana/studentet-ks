import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { formatNumber } from "@/lib/format";
import type { UniversityStanding } from "@/lib/competition/weekly";
import { cn } from "@/lib/utils";

/** Renditja e universiteteve: pikët, studentët aktivë, fitoret dhe kontributet. */
export async function UniversityStandings({
  rows,
  highlight,
  detailed = false,
}: {
  rows: UniversityStanding[];
  highlight?: string | null;
  detailed?: boolean;
}) {
  const [t, locale] = await Promise.all([getTranslations("competition"), getLocale()]);

  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-text-muted">{t("noUniversityPoints")}</p>;
  }

  const top = rows[0]?.points || 1;

  return (
    <ol className="flex flex-col gap-2" data-university-standings>
      {rows.map((row, index) => (
        <li
          key={row.universityId}
          data-university={row.abbr}
          className={cn(
            "flex flex-col gap-1.5 rounded-xl border p-3 transition-colors duration-150",
            row.universityId === highlight ? "border-brand-500/60 bg-brand-500/6" : "border-border bg-surface",
          )}
        >
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "tabular grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold",
                index === 0 ? "bg-accent-500 text-white" : index < 3 ? "bg-brand-500/15 text-text" : "bg-surface-2 text-text-muted",
              )}
            >
              {index + 1}
            </span>
            <Link href={`/gara/universiteti/${row.slug}`} className="min-w-0 flex-1 hover:underline">
              <span className="block truncate text-sm font-semibold text-text">{row.abbr}</span>
              <span className="block truncate text-xs text-text-muted">{row.name}</span>
            </Link>
            <span className="tabular shrink-0 text-sm font-semibold text-text">
              {t("pointsValue", { points: formatNumber(row.points, locale) })}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
            <div
              className="h-full rounded-full bg-brand-500 transition-[width] duration-400 ease-brand"
              style={{ width: `${Math.max(4, Math.round((row.points / top) * 100))}%` }}
            />
          </div>
          {detailed ? (
            <dl className="tabular grid grid-cols-3 gap-2 pt-1 text-xs text-text-muted">
              <div>
                <dt>{t("colParticipants")}</dt>
                <dd className="font-semibold text-text">{formatNumber(row.participants, locale)}</dd>
              </div>
              <div>
                <dt>{t("colWins")}</dt>
                <dd className="font-semibold text-text">{formatNumber(row.wins, locale)}</dd>
              </div>
              <div>
                <dt>{t("colContributions")}</dt>
                <dd className="font-semibold text-text">{formatNumber(row.contributions, locale)}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-xs text-text-muted">{t("participants", { count: row.participants })}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
