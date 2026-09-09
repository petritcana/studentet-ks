import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, FileText, MessageCircleQuestion, Newspaper } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { timeAgoShort } from "@/lib/format";

export const metadata: Metadata = {
  title: "Ruajtjet",
  description: "Gjithçka që ke lënë për më vonë.",
};

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const user = await requireUser();

  const bookmarks = await db.bookmark.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { targetId: true, targetType: true, createdAt: true },
  });

  const byType = (type: string) =>
    bookmarks.filter((item) => item.targetType === type).map((item) => item.targetId);

  const [posts, materials, questions] = await Promise.all([
    db.post.findMany({
      where: { id: { in: byType("post") }, isHidden: false },
      select: {
        id: true,
        text: true,
        type: true,
        createdAt: true,
        isAnonymous: true,
        pseudonym: true,
        author: { select: { name: true } },
      },
    }),
    db.material.findMany({
      where: { id: { in: byType("material") }, isHidden: false },
      select: {
        id: true,
        title: true,
        verificationStatus: true,
        course: { select: { name: true } },
      },
    }),
    db.question.findMany({
      where: { id: { in: byType("question") }, isHidden: false },
      select: {
        id: true,
        title: true,
        acceptedAnswerId: true,
        course: { select: { name: true } },
      },
    }),
  ]);

  const total = posts.length + materials.length + questions.length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Ruajtjet"
        description="Materialet, postimet dhe pyetjet që i ke lënë për më vonë."
        back="/une"
      />

      {total === 0 ? (
        <EmptyState
          illustration="materials"
          title="Ende s'ke ruajtur asgjë"
          description="Kur të gjesh diçka që do ta lexosh para provimit, kliko shenjën e ruajtjes dhe e gjen këtu."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {materials.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
                <FileText className="size-4 text-brand-500" />
                Materiale ({materials.length})
              </h2>
              <Card className="divide-y divide-border">
                {materials.map((material) => (
                  <Link
                    key={material.id}
                    href={`/materialet/${material.id}`}
                    className="flex items-center gap-3 p-3 transition-colors hover:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-text">{material.title}</span>
                      <span className="block truncate text-xs text-text-muted">
                        {material.course.name}
                      </span>
                    </span>
                    {material.verificationStatus === "verified" ? (
                      <Badge variant="success">I verifikuar</Badge>
                    ) : (
                      <Badge variant="warning">Pa verifikuar</Badge>
                    )}
                  </Link>
                ))}
              </Card>
            </section>
          ) : null}

          {questions.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
                <MessageCircleQuestion className="size-4 text-brand-500" />
                Pyetje ({questions.length})
              </h2>
              <Card className="divide-y divide-border">
                {questions.map((question) => (
                  <Link
                    key={question.id}
                    href={`/pyetje/${question.id}`}
                    className="flex items-center gap-3 p-3 transition-colors hover:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-text">{question.title}</span>
                      <span className="block truncate text-xs text-text-muted">
                        {question.course.name}
                      </span>
                    </span>
                    {question.acceptedAnswerId ? (
                      <Badge variant="success">Zgjidhur</Badge>
                    ) : (
                      <Badge variant="warning">Pa përgjigje</Badge>
                    )}
                  </Link>
                ))}
              </Card>
            </section>
          ) : null}

          {posts.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
                <Newspaper className="size-4 text-brand-500" />
                Postime ({posts.length})
              </h2>
              <Card className="divide-y divide-border">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/postimi/${post.id}`}
                    className="flex items-center gap-3 p-3 transition-colors hover:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-text">
                        {post.text.slice(0, 90)}
                      </span>
                      <span className="block truncate text-xs text-text-muted">
                        {post.isAnonymous ? (post.pseudonym ?? "Anonim") : post.author.name} ·{" "}
                        {timeAgoShort(post.createdAt)}
                      </span>
                    </span>
                  </Link>
                ))}
              </Card>
            </section>
          ) : null}
        </div>
      )}

      <Card className="p-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-text-muted" />
          <p className="text-xs text-text-muted">
            Materialet e ruajtura mbeten të lexueshme edhe pa internet, sapo ta instalosh
            aplikacionin në telefon.
          </p>
        </div>
      </Card>
    </div>
  );
}
