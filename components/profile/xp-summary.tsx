import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Flame, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { EXCHANGE_RATES, levelFor, levelLabelKey } from "@/lib/xp";

/**
 * Përmbledhja e XP-së te profili im, e ngjeshur.
 *
 * Vetëm niveli, seria e ditëve dhe dy shirita me «sa / nga sa»: niveli drejt
 * nivelit tjetër, dhe XP-ja e kontributit drejt këmbimit të radhës në Pro.
 * Shpjegimet e gjata jetojnë te `/une/xp`, ku të çon karta.
 */
export async function XpSummary({
  xpContribution,
  xpActivity,
  streak,
  proDays,
}: {
  xpContribution: number;
  xpActivity: number;
  streak: number;
  proDays: number;
}) {
  const [tg, tp, locale] = await Promise.all([getTranslations("gamification"), getTranslations("pro"), getLocale()]);
  const level = levelFor(xpContribution + xpActivity);
  const exchange = EXCHANGE_RATES.find((rate) => rate.xp > xpContribution) ?? EXCHANGE_RATES[EXCHANGE_RATES.length - 1];
  const n = (value: number) => formatNumber(value, locale);

  return (
    <Card className="p-4" data-xp-summary>
      <Link href="/une/xp" className="flex flex-col gap-3 rounded-control focus-visible:outline-2 focus-visible:outline-brand-500">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-text">{tg(levelLabelKey(level.key))}</p>
          <span className="inline-flex items-center gap-1 rounded-full border border-warning-line bg-warning-50 px-2 py-0.5 text-xs font-semibold text-warning-text">
            <Flame className="size-3.5" aria-hidden />
            {streak}
          </span>
          {proDays > 0 ? (
            <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-text-muted">
              <Sparkles className="size-3.5 text-brand-500" aria-hidden />
              {tp("proDaysShort", { days: proDays })}
            </span>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Bar
            label={level.next ? tg(levelLabelKey(level.next)) : tg("maxLevelShort")}
            value={level.ceiling ? `${n(level.current)} / ${n(level.ceiling)}` : n(level.current)}
            percent={level.percent}
          />
          <Bar
            label={tg("contributionXp")}
            value={`${n(xpContribution)} / ${n(exchange.xp)}`}
            percent={Math.min(100, (xpContribution / exchange.xp) * 100)}
          />
        </div>
      </Link>
    </Card>
  );
}

function Bar({ label, value, percent }: { label: string; value: string; percent: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-text-muted">{label}</span>
        <span className="tabular shrink-0 font-semibold text-text">{value}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 overflow-hidden rounded-full bg-surface-2"
      >
        <span className="block h-full rounded-full bg-brand-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
