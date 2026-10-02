import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommentThread } from "@/components/feed/comment-thread";
import { PostCard } from "@/components/feed/post-card";
import { getComments, getPostById } from "@/lib/queries/feed";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("feed");
  return { title: t("openPost") };
}

export const dynamic = "force-dynamic";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, me, locale] = await Promise.all([params, requireUser(), getLocale()]);

  const post = await getPostById(me.access, id, locale);
  if (!post) notFound();

  const [comments, tc] = await Promise.all([
    getComments(id, locale, me.id),
    getTranslations("common"),
  ]);

  const ownFaculty =
    (locale === "en" ? me.faculty?.nameEn : me.faculty?.name) ?? me.university?.abbr ?? "";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/feed">
          <ArrowLeft />
          {tc("back")}
        </Link>
      </Button>

      <PostCard post={post} ownFaculty={ownFaculty} isPro={me.pro} />

      <CommentThread
        postId={id}
        comments={comments}
        me={{ name: me.name, avatar: me.avatar }}
      />
    </div>
  );
}
