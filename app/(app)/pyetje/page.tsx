import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircleQuestion, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { timeAgoShort } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pyetje",
  description: "Pyet lëndën. Përgjigjet vijnë nga ata që e kanë kaluar atë provim.",
};

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "te-miat", label: "Lëndët e mia" },
  { key: "pa-pergjigje", label: "Pa përgjigje" },
  { key: "te-gjitha", label: "Të gjitha" },
] as const;

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ filtri?: string; lenda?: string }>;
}) {
  const params = await searchParams;
  const filter = FILTERS.find((item) => item.key === params.filtri)?.key ?? "te-miat";
  const user = await requireUser();

  const enrollments = await db.enrollment.findMany({
    where: { userId: user.id },
    select: { courseId: true },
  });
  const myCourseIds = enrollments.map((item) => item.courseId);

  const questions = await db.question.findMany({
    where: {
      isHidden: false,
      ...(params.lenda ? { courseId: params.lenda } : {}),
      ...(filter === "te-miat" && !params.lenda ? { courseId: { in: myCourseIds } } : {}),
      ...(filter === "pa-pergjigje" ? { acceptedAnswerId: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      title: true,
      text: true,
      createdAt: true,
      acceptedAnswerId: true,
      views: true,
      course: { select: { id: true, name: true } },
      author: { select: { name: true, username: true, avatar: true, isVerified: true } },
      _count: { select: { answers: true } },
    },
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Pyetje"
        description="Pyetja pa përgjigje pas gjashtë orësh u dërgohet pesë studentëve që e kanë kaluar atë lëndë me sukses."
        action={
          <Button asChild size="sm">
            <Link href="/pyetje/e-re">
              <Plus />
              Pyet
            </Link>
          </Button>
        }
      />

      <div
        role="tablist"
        aria-label="Filtrat e pyetjeve"
        className="flex items-center gap-1 rounded-full border border-border bg-bg p-1"
      >
        {FILTERS.map((item) => (
          <Link
            key={item.key}
            href={`/pyetje?filtri=${item.key}`}
            role="tab"
            aria-selected={filter === item.key}
            scroll={false}
            className={cn(
              "inline-flex h-9 flex-1 items-center justify-center rounded-full px-3 text-sm font-medium transition-colors duration-150 ease-brand",
              filter === item.key
                ? "bg-surface text-text shadow-soft"
                : "text-text-muted hover:text-text",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {questions.length === 0 ? (
        <EmptyState
          illustration="search"
          title={
            filter === "pa-pergjigje"
              ? "Çdo pyetje ka marrë përgjigje"
              : "Ende asnjë pyetje këtu"
          }
          description={
            filter === "pa-pergjigje"
              ? "Kjo është gjendja që duam. Kthehu më vonë ose bëj ti një pyetje."
              : "Nëse ke ngecur diku, pyet. Dikush nga viti mbi ty e ka kaluar këtë."
          }
          action={
            <Button asChild>
              <Link href="/pyetje/e-re">
                <MessageCircleQuestion />
                Bëj një pyetje
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {questions.map((question) => (
            <Link key={question.id} href={`/pyetje/${question.id}`}>
              <Card interactive className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar
                    name={question.author.name}
                    src={question.author.avatar}
                    size="sm"
                    verified={question.author.isVerified}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-text">
                      {question.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-text-muted">{question.text}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge>{question.course.name}</Badge>
                      {question.acceptedAnswerId ? (
                        <Badge variant="success">Zgjidhur</Badge>
                      ) : question._count.answers === 0 ? (
                        <Badge variant="warning">Pa përgjigje</Badge>
                      ) : (
                        <Badge variant="accent">
                          {question._count.answers} përgjigje
                        </Badge>
                      )}
                      <span className="tabular text-xs text-text-muted">
                        {timeAgoShort(question.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
