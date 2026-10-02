import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CheckCircle2, HelpCircle, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { timeAgo } from "@/lib/format";

export type QuestionRowData = {
  id: string;
  title: string;
  createdAt: Date;
  acceptedAnswerId: string | null;
  course: { name: string; nameEn: string };
  _count: { answers: number };
};

export const QUESTION_ROW_SELECT = {
  id: true,
  title: true,
  createdAt: true,
  acceptedAnswerId: true,
  course: { select: { name: true, nameEn: true } },
  _count: { select: { answers: true } },
} as const;

export async function QuestionRow({ question }: { question: QuestionRowData }) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("question")]);

  return (
    <Card interactive className="p-4">
      <Link href={`/pyetje/${question.id}`} className="flex flex-col gap-2">
        <p className="text-pretty text-sm font-semibold text-text">{question.title}</p>

        <p className="tabular flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
          <span>{locale === "en" ? question.course.nameEn : question.course.name}</span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="size-3" />
            {t("answersCount", { count: question._count.answers })}
          </span>
          <span>{timeAgo(question.createdAt, locale)}</span>
        </p>

        {question.acceptedAnswerId ? (
          <Badge variant="success" className="w-fit">
            <CheckCircle2 />
            {t("solved")}
          </Badge>
        ) : (
          <Badge variant="warning" className="w-fit">
            <HelpCircle />
            {t("noAccepted")}
          </Badge>
        )}
      </Link>
    </Card>
  );
}
