import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/format";
import { getLocale } from "next-intl/server";
import type { AnalyticsSummary } from "@/lib/queries/analytics";

/**
 * Paneli i analitikës.
 *
 * Numra, jo dekor. Çdo shifër këtu vjen nga një rresht i vërtetë në bazë, dhe
 * kur diçka nuk matet, nuk shfaqet: një numër i trilluar e bën tërë panelin të
 * pabesueshëm, dhe atëherë asnjë vendim nuk merret mbi të.
 */
export async function PostAnalyticsPanel({ data }: { data: AnalyticsSummary }) {
  const [t, ta, locale] = await Promise.all([
    getTranslations("analytics"),
    getTranslations("access"),
    getLocale(),
  ]);

  if (data.posts.length === 0) {
    return <EmptyState illustration="feed" title={t("emptyTitle")} description={t("emptyBody")} />;
  }

  const totals = [
    { key: "views", value: data.totals.views },
    { key: "likes", value: data.totals.likes },
    { key: "comments", value: data.totals.comments },
    { key: "saves", value: data.totals.saves },
    { key: "reposts", value: data.totals.reposts },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <Card className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-5">
        {totals.map((item) => (
          <div key={item.key} className="flex flex-col gap-0.5">
            <span className="tabular text-xl font-semibold text-text">{item.value}</span>
            <span className="text-xs text-text-muted">{t(item.key)}</span>
          </div>
        ))}
      </Card>

      <ul className="flex flex-col gap-2">
        {data.posts.map((post) => {
          // Sa nga ata që mund ta shihnin, e panë vërtet. Pa shtrirje, pa përqindje.
          const share = post.reach > 0 ? Math.min(100, Math.round((post.views / post.reach) * 100)) : null;

          return (
            <li key={post.id}>
              <Card className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="line-clamp-2 min-w-0 flex-1 text-sm text-text">{post.text}</p>
                  {post.featuredUntil ? (
                    <Badge variant="brand">{t("featured")}</Badge>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                  <span>{formatDate(post.createdAt, locale)}</span>
                  <span>{ta(`scopes.${post.scope}`)}</span>
                  {share !== null ? <span className="tabular">{t("share", { share })}</span> : null}
                </div>

                <dl className="grid grid-cols-3 gap-3 border-t border-border pt-3 sm:grid-cols-6">
                  <Metric label={t("views")} value={post.views} />
                  <Metric label={t("reach")} value={post.reach} />
                  <Metric label={t("likes")} value={post.likes} />
                  <Metric label={t("comments")} value={post.comments} />
                  <Metric label={t("saves")} value={post.saves} />
                  <Metric label={t("reposts")} value={post.reposts} />
                </dl>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] text-text-muted">{label}</dt>
      <dd className="tabular text-sm font-semibold text-text">{value}</dd>
    </div>
  );
}
