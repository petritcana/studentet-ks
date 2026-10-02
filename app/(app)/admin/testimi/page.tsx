import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { FeedbackCard, type FeedbackView } from "@/components/admin/feedback-card";
import { EmptyState } from "@/components/shared/empty-state";
import { db } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/format";
import { parseMedia } from "@/lib/media";
import { requireAdmin } from "@/lib/session";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminFeedback");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

const FILTERS = ["te-reja", "problemet", "sugjerimet", "te-zgjidhura", "te-gjitha"] as const;
type Filter = (typeof FILTERS)[number];
const SOURCES = ["njerez", "bot"] as const;

function whereFor(filter: Filter) {
  switch (filter) {
    case "te-reja":
      return { status: "new" };
    case "problemet":
      return { kind: "bug", status: { not: "resolved" } };
    case "sugjerimet":
      return { kind: "suggestion", status: { not: "resolved" } };
    case "te-zgjidhura":
      return { status: "resolved" };
    default:
      return {};
  }
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Raportet e testuesve.
 *
 * Çdo raport ka personin, faqen ku ishte, pajisjen dhe gabimet e fundit të
 * JavaScript-it që i kapi shfletuesi. Raportet e bot-ëve (`npm run bot:testers`)
 * janë probleme të gjetura vetë nga shëtitja automatike e faqeve.
 */
export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ filtri?: string; burimi?: string }>;
}) {
  const [, locale, t, tAdmin, params] = await Promise.all([
    requireAdmin(),
    getLocale(),
    getTranslations("adminFeedback"),
    getTranslations("admin"),
    searchParams,
  ]);
  const filter: Filter = FILTERS.includes(params.filtri as Filter) ? (params.filtri as Filter) : "te-reja";
  const source = SOURCES.includes(params.burimi as (typeof SOURCES)[number]) ? params.burimi : null;
  const sourceWhere = source === "bot" ? { source: "bot" } : source === "njerez" ? { source: "user" } : {};

  const [rows, ...counts] = await db.$transaction([
    db.feedback.findMany({
      where: { ...whereFor(filter), ...sourceWhere },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        kind: true,
        message: true,
        path: true,
        device: true,
        errors: true,
        media: true,
        status: true,
        source: true,
        adminNote: true,
        createdAt: true,
        user: { select: { name: true, username: true, avatar: true } },
      },
    }),
    ...FILTERS.map((value) => db.feedback.count({ where: { ...whereFor(value), ...sourceWhere } })),
  ]);

  // Koha shkruhet këtu, në server: e llogaritur te klienti do ta prishte hidratimin.
  const items: FeedbackView[] = rows.map((row) => ({
    id: row.id,
    kind: row.kind === "suggestion" ? "suggestion" : "bug",
    message: row.message,
    path: row.path,
    device: parseJson<Record<string, string | number | boolean>>(row.device, {}),
    errors: parseJson<string[]>(row.errors, []),
    media: parseMedia(row.media),
    status: row.status === "resolved" ? "resolved" : row.status === "seen" ? "seen" : "new",
    source: row.source === "bot" ? "bot" : "user",
    adminNote: row.adminNote ?? "",
    when: `${formatDate(row.createdAt, locale)}, ${formatTime(row.createdAt)}`,
    user: row.user,
  }));

  const hrefFor = (value: Filter, sourceValue: string | null) => {
    const query = new URLSearchParams();
    if (value !== "te-reja") query.set("filtri", value);
    if (sourceValue) query.set("burimi", sourceValue);
    const text = query.toString();
    return text ? `/admin/testimi?${text}` : "/admin/testimi";
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <Link href="/admin" className="inline-flex w-fit items-center gap-1.5 text-sm text-text-muted hover:text-text">
        <ArrowLeft className="size-4" />
        {tAdmin("title")}
      </Link>

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text">{t("title")}</h1>
        <p className="measure text-sm text-text-muted">{t("subtitle")}</p>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label={t("filters")}>
        {FILTERS.map((value, index) => (
          <Link
            key={value}
            href={hrefFor(value, source ?? null)}
            aria-current={value === filter ? "page" : undefined}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-control px-3.5 text-sm font-semibold transition-colors",
              value === filter ? "bg-tab-active text-on-tab-active" : "text-text-muted hover:bg-surface-2 hover:text-text",
            )}
            data-feedback-filter={value}
          >
            {t(`filter_${value}`)}
            <span className="tabular rounded-full bg-surface-2 px-2 text-xs text-text-muted">{counts[index]}</span>
          </Link>
        ))}
      </nav>
      <nav className="-mt-2 flex flex-wrap gap-2 text-xs" aria-label={t("sources")}>
        {[null, "njerez", "bot"].map((value) => (
          <Link
            key={value ?? "te-gjithe"}
            href={hrefFor(filter, value)}
            aria-current={(source ?? null) === value ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 font-semibold transition-colors",
              (source ?? null) === value ? "border-brand-500 bg-brand-50 text-brand-500" : "border-border text-text-muted hover:text-text",
            )}
          >
            {t(value === "bot" ? "sourceBots" : value === "njerez" ? "sourcePeople" : "sourceAll")}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <EmptyState illustration="feed" compact title={t("empty")} description={t("emptyBody")} />
      ) : (
        <ul className="flex flex-col gap-3" data-feedback-list>
          {items.map((item) => (
            <li key={item.id}>
              <FeedbackCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
