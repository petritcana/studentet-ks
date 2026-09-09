import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ReportQueue, type QueueItem } from "@/components/moderation/report-queue";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { db } from "@/lib/db";
import { requireModerator } from "@/lib/session";

export const metadata: Metadata = {
  title: "Moderimi",
  description: "Radha e raportimeve dhe statistikat e javës.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ModerationPage() {
  await requireModerator();

  const [reports, stats, weekly] = await Promise.all([
    db.report.findMany({
      where: { status: { in: ["open", "reviewing"] } },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: {
        id: true,
        targetId: true,
        targetType: true,
        reason: true,
        note: true,
        status: true,
        createdAt: true,
        reporter: { select: { name: true, username: true } },
      },
    }),
    Promise.all([
      db.report.count({ where: { status: "open" } }),
      db.report.count({ where: { status: "reviewing" } }),
      db.report.count({ where: { status: "actioned" } }),
      db.report.count({ where: { status: "dismissed" } }),
    ]),
    db.moderationLog.findMany({ orderBy: { weekOf: "desc" }, take: 4 }),
  ]);

  // Përmbajtja e raportuar, e ngarkuar veç sepse llojet ndryshojnë.
  const postIds = reports.filter((r) => r.targetType === "post").map((r) => r.targetId);
  const commentIds = reports.filter((r) => r.targetType === "comment").map((r) => r.targetId);
  const materialIds = reports.filter((r) => r.targetType === "material").map((r) => r.targetId);

  const [posts, comments, materials] = await Promise.all([
    db.post.findMany({
      where: { id: { in: postIds } },
      select: {
        id: true,
        text: true,
        isHidden: true,
        isAnonymous: true,
        pseudonym: true,
        author: { select: { name: true, username: true } },
      },
    }),
    db.comment.findMany({
      where: { id: { in: commentIds } },
      select: {
        id: true,
        text: true,
        isHidden: true,
        author: { select: { name: true, username: true } },
      },
    }),
    db.material.findMany({
      where: { id: { in: materialIds } },
      select: {
        id: true,
        title: true,
        isHidden: true,
        uploader: { select: { name: true, username: true } },
      },
    }),
  ]);

  const contentFor = (targetId: string, targetType: string) => {
    if (targetType === "post") {
      const post = posts.find((item) => item.id === targetId);
      return post
        ? {
            excerpt: post.text,
            author: post.isAnonymous
              ? (post.pseudonym ?? "Anonim")
              : post.author.name,
            authorUsername: post.isAnonymous ? null : post.author.username,
            isHidden: post.isHidden,
            href: `/postimi/${post.id}`,
          }
        : null;
    }
    if (targetType === "comment") {
      const comment = comments.find((item) => item.id === targetId);
      return comment
        ? {
            excerpt: comment.text,
            author: comment.author.name,
            authorUsername: comment.author.username,
            isHidden: comment.isHidden,
            href: null,
          }
        : null;
    }
    if (targetType === "material") {
      const material = materials.find((item) => item.id === targetId);
      return material
        ? {
            excerpt: material.title,
            author: material.uploader.name,
            authorUsername: material.uploader.username,
            isHidden: material.isHidden,
            href: `/materialet/${material.id}`,
          }
        : null;
    }
    return null;
  };

  const queue: QueueItem[] = reports.map((report) => ({
    id: report.id,
    targetId: report.targetId,
    targetType: report.targetType,
    reason: report.reason,
    note: report.note,
    status: report.status,
    createdAt: report.createdAt.toISOString(),
    reporter: report.reporter.name,
    content: contentFor(report.targetId, report.targetType),
  }));

  const [open, reviewing, actioned, dismissed] = stats;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Moderimi"
        description="Koha e premtuar e reagimit është 24 orë. Vendimet dalin të agreguara publikisht."
        action={
          <Link
            href="/moderimi/publik"
            className="text-sm font-medium text-brand-500 hover:underline"
          >
            Raporti publik
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Të hapura" value={open} tone="warning" />
        <StatCard label="Në shqyrtim" value={reviewing} tone="brand" />
        <StatCard label="Me masë" value={actioned} tone="danger" />
        <StatCard label="Të mbyllura" value={dismissed} tone="neutral" />
      </div>

      {weekly.length > 0 ? (
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-brand-500" />
            <h2 className="text-sm font-semibold text-text">Javët e fundit</h2>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {weekly.map((log) => (
              <li key={log.id} className="flex items-center gap-3 text-sm">
                <span className="tabular w-28 shrink-0 text-text-muted">
                  {log.weekOf.toLocaleDateString("sq-AL")}
                </span>
                <span className="tabular text-text">{log.removed} të hequra</span>
                <span className="tabular text-text-muted">{log.reviewed} të shqyrtuara</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {queue.length === 0 ? (
        <EmptyState
          illustration="feed"
          title="Radha është bosh"
          description="Asnjë raportim i hapur. Kjo është gjendja që duam."
        />
      ) : (
        <ReportQueue items={queue} />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "warning" | "brand" | "danger" | "neutral";
}) {
  return (
    <Card className="flex flex-col gap-1 p-3">
      <span className="tabular text-xl font-semibold text-text">{value}</span>
      <Badge variant={tone === "neutral" ? "neutral" : tone}>{label}</Badge>
    </Card>
  );
}
