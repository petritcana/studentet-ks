import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommentThread } from "@/components/feed/comment-thread";
import { PostCard } from "@/components/feed/post-card";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { getPostWithComments } from "@/lib/queries/post";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Postimi" };

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const data = await getPostWithComments(id, user.id);
  if (!data) notFound();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Postimi" back="/feed" />
      <PostCard post={data.post} />
      <Card className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-text">
          Komentet ({data.comments.length})
        </h2>
        <div className="mt-4">
          <CommentThread
            postId={data.post.id}
            comments={data.comments}
            viewer={{ name: user.name, avatar: user.avatar }}
          />
        </div>
      </Card>
    </div>
  );
}
