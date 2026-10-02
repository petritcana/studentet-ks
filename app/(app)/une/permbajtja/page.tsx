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
import { getProfilePosts } from "@/lib/queries/feed";
import { getMaterials } from "@/lib/queries/materials";
import { requireUser } from "@/lib/session";

const TABS = ["postimet", "materialet", "pyetjet"] as const;
type Tab = (typeof TABS)[number];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("myContent");
  return { title: t("title") };
}

export const dynamic = "force-dynamic";

export default async function MyContentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [me, locale, params, t] = await Promise.all([
    requireUser(),
    getLocale(),
    searchParams,
    getTranslations("myContent"),
  ]);

  const tab = (TABS.includes(params.tab as Tab) ? params.tab : "postimet") as Tab;

  const [postCount, materialCount, questionCount] = await Promise.all([
    db.post.count({ where: { authorId: me.id, isAnonymous: false } }),
    db.material.count({ where: { uploaderId: me.id } }),
    db.question.count({ where: { authorId: me.id } }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text">{t("title")}</h1>
        <p className="measure text-sm text-text-muted">{t("subtitle")}</p>
      </header>

      <SegmentedNav
        base="/une/permbajtja"
        active={tab}
        items={[
          { value: "postimet", label: t("posts"), count: postCount },
          { value: "materialet", label: t("materials"), count: materialCount },
          { value: "pyetjet", label: t("questions"), count: questionCount },
        ]}
      />

      {tab === "postimet" ? (
        postCount === 0 ? (
          <EmptyState illustration="feed" title={t("emptyPosts")} />
        ) : (
          <div className="flex flex-col gap-4">
            {(await getProfilePosts(me.access, me.id, locale, { take: 30 })).posts.map((post) => (
              <PostCard key={post.id} post={post} ownFaculty="" isPro={me.pro} />
            ))}
          </div>
        )
      ) : null}

      {tab === "materialet" ? (
        materialCount === 0 ? (
          <EmptyState
            illustration="materials"
            title={t("emptyMaterials")}
            action={
              <Button asChild size="sm">
                <Link href="/materialet/ngarko">{t("upload")}</Link>
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {(await getMaterials(me, { uploaderId: me.id, scope: "all" }, locale)).map((material) => (
              <MaterialRow key={material.id} material={material} />
            ))}
          </div>
        )
      ) : null}

      {tab === "pyetjet" ? (
        questionCount === 0 ? (
          <EmptyState
            illustration="search"
            title={t("emptyQuestions")}
            action={
              <Button asChild size="sm">
                <Link href="/feed">{t("ask")}</Link>
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {(
              await db.question.findMany({
                where: { authorId: me.id },
                orderBy: { createdAt: "desc" },
                take: 40,
                select: QUESTION_ROW_SELECT,
              })
            ).map((question) => (
              <li key={question.id}>
                <QuestionRow question={question} />
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
