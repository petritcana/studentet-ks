import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PostCard } from "@/components/feed/post-card";
import { getHashtagPosts } from "@/lib/queries/feed";
import { requireUser } from "@/lib/session";

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag } = await params;
  return { title: `#${decodeURIComponent(tag)}` };
}

export const dynamic = "force-dynamic";

/**
 * Një temë: postimet me #hashtag-un, nga më i riu, vetëm ato që studenti i
 * sheh në rrethin e vet. Prekja e një #tag-u kudo në platformë sjell këtu.
 */
export default async function HashtagPage({ params }: { params: Promise<{ tag: string }> }) {
  const [{ tag: raw }, me, locale, t, tc] = await Promise.all([
    params,
    requireUser(),
    getLocale(),
    getTranslations("hashtag"),
    getTranslations("common"),
  ]);
  const tag = decodeURIComponent(raw).replace(/^#/, "").slice(0, 40);
  const posts = /^[\p{L}\p{N}_]{2,40}$/u.test(tag) ? await getHashtagPosts(me.access, tag, locale) : [];
  const ownFaculty = (locale === "en" ? me.faculty?.nameEn : me.faculty?.name) ?? me.university?.abbr ?? "";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/feed">
          <ArrowLeft />
          {tc("back")}
        </Link>
      </Button>
      <header className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-500" aria-hidden>
          <Hash className="size-6" />
        </span>
        <div className="flex flex-col">
          <h1 className="font-display text-2xl font-bold text-text" data-hashtag-title>
            #{tag}
          </h1>
          <p className="text-sm text-text-muted">{t("count", { count: posts.length })}</p>
        </div>
      </header>

      {posts.length === 0 ? (
        <EmptyState illustration="search" title={t("empty")} description={t("emptyBody", { tag })} />
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} ownFaculty={ownFaculty} isPro={me.pro} />)
      )}
    </div>
  );
}
