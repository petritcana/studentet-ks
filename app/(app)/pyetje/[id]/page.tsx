import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AnswerPanel } from "@/components/academic/answer-panel";
import { ReportButton } from "@/components/shared/report-button";
import { SaveButton } from "@/components/shared/save-button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { timeAgoShort } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const question = await db.question.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: question?.title ?? "Pyetja" };
}

export const dynamic = "force-dynamic";

export default async function QuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const question = await db.question.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      text: true,
      views: true,
      createdAt: true,
      acceptedAnswerId: true,
      isHidden: true,
      authorId: true,
      course: { select: { id: true, name: true, code: true } },
      author: { select: { name: true, username: true, avatar: true, isVerified: true } },
      answers: {
        where: { isHidden: false },
        select: {
          id: true,
          text: true,
          votes: true,
          createdAt: true,
          author: {
            select: { id: true, name: true, username: true, avatar: true, isVerified: true },
          },
          voters: { where: { userId: user.id }, select: { value: true } },
        },
      },
    },
  });

  if (!question || question.isHidden) notFound();

  const [saved, enrolled] = await Promise.all([
    db.bookmark.findUnique({
      where: {
        userId_targetId_targetType: {
          userId: user.id,
          targetId: question.id,
          targetType: "question",
        },
      },
      select: { id: true },
    }),
    db.enrollment.findFirst({
      where: { userId: user.id, courseId: question.course.id },
      select: { id: true },
    }),
  ]);

  await db.question.update({
    where: { id: question.id },
    data: { views: { increment: 1 } },
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Pyetja" back="/pyetje" />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/lenda/${question.course.id}`}>
            <Badge variant="brand">{question.course.name}</Badge>
          </Link>
          {question.acceptedAnswerId ? (
            <Badge variant="success">Zgjidhur</Badge>
          ) : (
            <Badge variant="warning">Pa përgjigje të pranuar</Badge>
          )}
          <span className="tabular inline-flex items-center gap-1 text-xs text-text-muted">
            <Eye className="size-3" />
            {question.views}
          </span>
        </div>

        <h2 className="mt-3 text-lg font-semibold text-text">{question.title}</h2>
        <p className="measure mt-2 whitespace-pre-line text-sm text-text">{question.text}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <Link href={`/u/${question.author.username}`} className="flex items-center gap-2">
            <Avatar
              name={question.author.name}
              src={question.author.avatar}
              size="sm"
              verified={question.author.isVerified}
            />
            <span className="text-sm text-text">{question.author.name}</span>
          </Link>
          <span className="tabular text-xs text-text-muted">
            {timeAgoShort(question.createdAt)}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <SaveButton
              targetId={question.id}
              targetType="question"
              initialSaved={Boolean(saved)}
              variant="ghost"
              size="sm"
            />
            <ReportButton targetId={question.id} targetType="post" size="sm" />
          </div>
        </div>
      </Card>

      <AnswerPanel
        questionId={question.id}
        acceptedAnswerId={question.acceptedAnswerId}
        isAuthor={question.authorId === user.id}
        viewer={{ name: user.name, avatar: user.avatar }}
        canAnswerHint={
          enrolled
            ? "Je në këtë lëndë. Përgjigjja jote peshon."
            : "S'je regjistruar në këtë lëndë, por nëse e ke kaluar, përgjigjja jote vlen dyfish."
        }
        answers={question.answers.map((answer) => ({
          id: answer.id,
          text: answer.text,
          votes: answer.votes,
          createdAt: answer.createdAt.toISOString(),
          myVote: answer.voters[0]?.value ?? 0,
          author: answer.author,
        }))}
      />
    </div>
  );
}
