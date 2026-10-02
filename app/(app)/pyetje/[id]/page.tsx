import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AnswerThread } from "@/components/questions/answer-thread";
import { UserIdentityLine } from "@/components/identity/user-identity-line";
import { db } from "@/lib/db";
import { toPublicAuthor } from "@/lib/dto";
import { formatDate } from "@/lib/format";
import { isTeacher } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

const AUTHOR_SELECT = {
  id: true,
  name: true,
  username: true,
  avatar: true,
  isVerified: true,
  role: true,
  year: true,
  proEarnedUntil: true,
  university: { select: { abbr: true } },
  faculty: { select: { name: true, nameEn: true, color: true } },
  subscriptions: { where: { status: "active" as const }, select: { status: true, expiresAt: true } },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const question = await db.question.findUnique({ where: { id }, select: { title: true } });
  return { title: question?.title ?? "" };
}

export const dynamic = "force-dynamic";

export default async function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, me, locale] = await Promise.all([params, requireUser(), getLocale()]);
  const english = locale === "en";

  const question = await db.question.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      text: true,
      createdAt: true,
      authorId: true,
      acceptedAnswerId: true,
      course: { select: { id: true, name: true, nameEn: true } },
      author: { select: AUTHOR_SELECT },
      answers: {
        where: { isHidden: false },
        select: {
          id: true,
          text: true,
          votes: true,
          createdAt: true,
          author: { select: AUTHOR_SELECT },
          voters: { where: { userId: me.id }, select: { value: true } },
        },
      },
    },
  });
  if (!question) notFound();

  await db.question.update({ where: { id }, data: { views: { increment: 1 } } });

  const t = await getTranslations("question");

  const enrolled = me.courseIds.includes(question.course.id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <Card className="flex flex-col gap-3 p-4 sm:p-5">
        <Link
          href={`/lenda/${question.course.id}`}
          className="w-fit text-xs text-text-muted hover:text-text"
        >
          <Badge variant="brand">{english ? question.course.nameEn : question.course.name}</Badge>
        </Link>

        <h1 className="text-pretty text-xl font-semibold tracking-tight text-text">
          {question.title}
        </h1>

        <p className="measure whitespace-pre-wrap text-pretty text-sm text-text">{question.text}</p>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
          <UserIdentityLine
            user={toPublicAuthor(question.author, locale)}
            size="sm"
            className="min-w-0 flex-1"
          />
          <span className="tabular text-xs text-text-muted">
            {formatDate(question.createdAt, locale)}
          </span>
        </div>

        <p className="text-xs text-text-muted">
          {enrolled ? t("enrolledHint") : t("notEnrolledHint")}
        </p>
        <p className="text-xs text-success-text">{t("neverPaywalled")}</p>
      </Card>

      <AnswerThread
        questionId={question.id}
        isAuthor={question.authorId === me.id}
        hasAccepted={Boolean(question.acceptedAnswerId)}
        answers={question.answers.map((answer) => ({
          id: answer.id,
          text: answer.text,
          votes: answer.votes,
          createdAt: answer.createdAt.toISOString(),
          myVote: answer.voters[0]?.value ?? 0,
          isAccepted: answer.id === question.acceptedAnswerId,
          isStaff: isTeacher({ role: answer.author.role }),
          author: toPublicAuthor(answer.author, locale),
        }))}
      />
    </div>
  );
}
