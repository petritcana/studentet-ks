import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Avatar } from "@/components/ui/avatar";
import { TimeAgo } from "@/components/shared/time-ago";
import { isCategory } from "@/lib/competition/categories";
import type { FeedItem } from "@/lib/competition/feed";

const ICONS: Record<string, string> = {
  battle_won: "⚔️",
  achievement: "🏅",
  university_rank: "📈",
  daily_milestone: "🧠",
  team_event: "🏟️",
  weekly_result: "🏆",
  university_milestone: "🎯",
};

/**
 * Feed-i i garës: ngjarje të strukturuara, të ndërtuara në gjuhën e studentit.
 * Nuk janë postime dhe nuk dalin kurrë te feed-i i ballinës.
 */
export async function CompetitionFeed({ items }: { items: FeedItem[] }) {
  const t = await getTranslations("competition");

  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-text-muted">{t("feedEmpty")}</p>;
  }

  const sentence = (item: FeedItem) => {
    const actor = item.actor?.name ?? "";
    const university = item.university?.abbr ?? "";
    const category = String(item.payload.category ?? "");
    const code = String(item.payload.code ?? "");
    switch (item.kind) {
      case "battle_won":
        return t("event_battle_won", { actor, category: isCategory(category) ? t(`cat_${category}`) : "" });
      case "achievement":
        return t("event_achievement", { actor, name: code.startsWith("comp_") ? t(`ach_${code}`) : code });
      case "university_rank":
        return t("event_university_rank", { university, rank: Number(item.payload.rank ?? 0) });
      case "daily_milestone":
        return t("event_daily_milestone", { count: Number(item.payload.count ?? 0) });
      case "team_event":
        return t("event_team_event", {
          title: String(item.payload.title ?? ""),
          scoreA: Number(item.payload.scoreA ?? 0),
          scoreB: Number(item.payload.scoreB ?? 0),
        });
      case "weekly_result":
        return t("event_weekly_result", { university, week: String(item.payload.week ?? "") });
      case "university_milestone":
        return t("event_university_milestone", { university, points: Number(item.payload.points ?? 0) });
      default:
        return "";
    }
  };

  return (
    <ul className="flex flex-col divide-y divide-border" data-competition-feed>
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 py-2.5">
          {item.actor ? (
            <Link href={`/u/${item.actor.username}`} className="shrink-0">
              <Avatar name={item.actor.name} src={item.actor.avatar} size="sm" />
            </Link>
          ) : (
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-base" aria-hidden>
              {ICONS[item.kind] ?? "🏆"}
            </span>
          )}
          <p className="min-w-0 flex-1 text-sm text-text">
            <span aria-hidden>{item.actor ? `${ICONS[item.kind] ?? ""} ` : ""}</span>
            {sentence(item)}
          </p>
          <TimeAgo value={item.createdAt} className="tabular shrink-0 text-[11px] text-text-muted" />
        </li>
      ))}
    </ul>
  );
}
