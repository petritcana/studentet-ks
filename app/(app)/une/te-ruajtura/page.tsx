import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { SegmentedNav } from "@/components/shared/segmented-nav";
import { PostCard } from "@/components/feed/post-card";
import { MaterialRow } from "@/components/materials/material-row";
import { QuestionRow, QUESTION_ROW_SELECT } from "@/components/questions/question-row";
import { db } from "@/lib/db";
import { getPostsByIds } from "@/lib/queries/feed";
import { getMaterials } from "@/lib/queries/materials";
import { requireUser } from "@/lib/session";

const TABS = ["postimet", "materialet", "pyetjet"] as const;
type Tab = (typeof TABS)[number];

const TARGET: Record<Tab, string> = { postimet: "post", materialet: "material", pyetjet: "question" };
const BROWSE: Record<Tab, string> = { postimet: "/feed", materialet: "/materialet", pyetjet: "/feed" };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("saved");
  return { title: t("title") };
}

export const dynamic = "force-dynamic";

export default async function SavedPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [me, locale, params, t] = await Promise.all([
    requireUser(),
    getLocale(),
    searchParams,
    getTranslations("saved"),
  ]);

  const tab = (TABS.includes(params.tab as Tab) ? params.tab : "postimet") as Tab;

  const [bookmarks, counts] = await Promise.all([
    db.bookmark.findMany({
      where: { userId: me.id, targetType: TARGET[tab] },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { targetId: true },
    }),
    db.bookmark.groupBy({
      by: ["targetType"],
      where: { userId: me.id },
      _count: { targetType: true },
    }),
  ]);

  const ids = bookmarks.map((row) => row.targetId);
  const count = (type: string) =>
    counts.find((row) => row.targetType === type)?._count.targetType ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text">{t("title")}</h1>
        <p className="measure text-sm text-text-muted">{t("subtitle")}</p>
      </header>

      <SegmentedNav
        base="/une/te-ruajtura"
        active={tab}
        items={[
          { value: "postimet", label: t("posts"), count: count("post") },
          { value: "materialet", label: t("materials"), count: count("material") },
          { value: "pyetjet", label: t("questions"), count: count("question") },
        ]}
      />

      {ids.length === 0 ? (
        <EmptyState
          illustration="search"
          title={t(`empty_${tab}`)}
          action={
            <Button asChild size="sm">
              <Link href={BROWSE[tab]}>{t(`browse_${tab}`)}</Link>
            </Button>
          }
        />
      ) : null}

      {ids.length > 0 && tab === "postimet" ? (
        <div className="flex flex-col gap-4">
          {(await getPostsByIds(me.access, ids, locale)).map((post) => (
            <PostCard key={post.id} post={post} ownFaculty="" />
          ))}
        </div>
      ) : null}

      {ids.length > 0 && tab === "materialet" ? (
        <div className="flex flex-col gap-2">
          {(await getMaterials(me, { ids, scope: "all" }, locale)).map((material) => (
            <MaterialRow key={material.id} material={material} />
          ))}
        </div>
      ) : null}

      {ids.length > 0 && tab === "pyetjet" ? (
        <ul className="flex flex-col gap-3">
          {(
            await db.question.findMany({
              where: { id: { in: ids }, isHidden: false },
              select: QUESTION_ROW_SELECT,
            })
          ).map((question) => (
            <li key={question.id}>
              <QuestionRow question={question} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
