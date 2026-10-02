import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Bookmark, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CACHE_TAGS, cachedBy } from "@/lib/cache";
import { db } from "@/lib/db";
import { postScopeFilter, type AccessUser } from "@/lib/access";
import { formatNumber } from "@/lib/format";

/** «Këtë javë», zëri i komunitetit brenda shtyllës. */
const loadWeeklyCandidates = cachedBy(
  async (access: AccessUser) => {
    const since = new Date(Date.now() - 7 * 86_400_000);
    return db.post.findMany({
      where: {
        ...postScopeFilter(access),
        isHidden: false,
        isAnonymous: false,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true,
        text: true,
        saveCount: true,
        commentCount: true,
        likeCount: true,
        author: { select: { name: true, username: true } },
      course: { select: { name: true, nameEn: true } },
      },
    });
  },
  ["kete-jave"],
  { revalidate: 300, tags: [CACHE_TAGS.weekly] },
);

export async function WeeklyCard({ user }: { user: { access: AccessUser } }) {
  const [locale, t, candidates] = await Promise.all([
    getLocale(),
    getTranslations("weekly"),
    loadWeeklyCandidates(user.access),
  ]);
  const english = locale === "en";

  // Ruajtja është sinjali më i fortë, komenti i dyti, pëlqimi mezi numëron.
  const best = candidates
    .map((post) => ({
      post,
      score: post.saveCount * 3 + post.commentCount * 2 + post.likeCount * 0.2,
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)[0];

  if (!best) return null;

  const { post } = best;
  const courseName = post.course ? (english ? post.course.nameEn : post.course.name) : null;

  return (
    <Card className="flex flex-col gap-2.5 p-5">
      <h2 className="text-base font-bold text-text">{t("title")}</h2>

      <Link href={`/postimi/${post.id}`} className="group flex flex-col gap-1.5">
        <p className="measure line-clamp-3 text-[15px] leading-[1.55] text-text transition-colors duration-150 group-hover:text-brand-500">
          {post.text}
        </p>

        <p className="truncate text-[13px] text-text-muted">
          {courseName ? `${post.author.name} · ${courseName}` : post.author.name}
        </p>
      </Link>

      <dl className="flex items-center gap-4 border-t border-border pt-2 text-xs text-text-muted">
        <div className="flex items-center gap-1.5">
          <dt>
            <Bookmark className="size-3.5" aria-hidden />
            <span className="sr-only">{t("saves")}</span>
          </dt>
          <dd className="tabular">{formatNumber(post.saveCount, locale)}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt>
            <MessageSquare className="size-3.5" aria-hidden />
            <span className="sr-only">{t("comments")}</span>
          </dt>
          <dd className="tabular">{formatNumber(post.commentCount, locale)}</dd>
        </div>
      </dl>
    </Card>
  );
}
