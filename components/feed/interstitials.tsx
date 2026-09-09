import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Download,
  FileText,
  MessageCircleQuestion,
  Star,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserRow } from "@/components/social/user-card";
import { MATERIAL_TYPE_LABELS, type MaterialType } from "@/lib/constants";
import { formatEventDate, timeAgoShort } from "@/lib/format";
import type { SuggestedPerson } from "@/lib/suggestions";
import { formatNumber } from "@/lib/utils";

function Frame({
  title,
  hint,
  children,
  action,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="border-dashed bg-surface/70 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-text">{title}</h2>
        {hint ? <span className="text-xs text-text-muted">{hint}</span> : null}
      </div>
      <div className="mt-3">{children}</div>
      {action ? <div className="mt-3">{action}</div> : null}
    </Card>
  );
}

/** Njësia (c): rekomandime me arsye të shkruar, kurrë profile pa kontekst. */
export function PeopleUnit({
  people,
  followingIds,
}: {
  people: SuggestedPerson[];
  followingIds: string[];
}) {
  if (people.length === 0) return null;

  return (
    <Frame
      title="Njerëz nga gjenerata jote"
      hint="rifreskohet çdo javë"
      action={
        <Button asChild variant="ghost" size="sm">
          <Link href="/kampusi">
            Shiko të gjithë
            <ArrowRight />
          </Link>
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {people.slice(0, 3).map((person) => (
          <UserRow
            key={person.id}
            person={person}
            followState={followingIds.includes(person.id) ? "following" : "none"}
          />
        ))}
      </div>
    </Frame>
  );
}

export function MaterialUnit({
  material,
}: {
  material: {
    id: string;
    title: string;
    type: string;
    rating: number;
    downloads: number;
    pages: number | null;
    course: { id: string; name: string };
    uploader: { name: string; username: string; avatar: string | null };
  };
}) {
  return (
    <Frame title="I ri për lëndët e tua">
      <Link
        href={`/materialet/${material.id}`}
        className="flex items-start gap-3 rounded-md p-2 transition-colors duration-150 hover:bg-surface-2"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-md bg-brand-500/12 text-brand-500">
          <FileText className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-medium text-text">{material.title}</span>
          <span className="truncate text-xs text-text-muted">
            {material.course.name} ·{" "}
            {MATERIAL_TYPE_LABELS[material.type as MaterialType] ?? material.type}
            {material.pages ? ` · ${material.pages} faqe` : ""}
          </span>
          <span className="flex items-center gap-3 text-xs text-text-muted">
            <span className="tabular inline-flex items-center gap-1">
              <Star className="size-3 fill-warning text-warning" />
              {material.rating.toFixed(1)}
            </span>
            <span className="tabular inline-flex items-center gap-1">
              <Download className="size-3" />
              {formatNumber(material.downloads)}
            </span>
          </span>
        </span>
        <Avatar name={material.uploader.name} src={material.uploader.avatar} size="sm" />
      </Link>
    </Frame>
  );
}

/** Pyetja pa përgjigje shkon te ata që e kanë kaluar lëndën. */
export function QuestionUnit({
  question,
}: {
  question: {
    id: string;
    title: string;
    courseName: string;
    answerCount: number;
    createdAt: string;
  };
}) {
  return (
    <Frame title="Kjo pyetje pret përgjigje" hint={timeAgoShort(question.createdAt)}>
      <Link
        href={`/pyetje/${question.id}`}
        className="flex items-start gap-3 rounded-md p-2 transition-colors duration-150 hover:bg-surface-2"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-md bg-accent-500/12 text-accent-text">
          <MessageCircleQuestion className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="line-clamp-2 text-sm font-medium text-text">{question.title}</span>
          <span className="truncate text-xs text-text-muted">
            {question.courseName} ·{" "}
            {question.answerCount === 0
              ? "asnjë përgjigje ende"
              : `${question.answerCount} përgjigje, asnjë e pranuar`}
          </span>
          <Badge variant="accent" className="w-fit">
            Ti e ke marrë këtë lëndë
          </Badge>
        </span>
      </Link>
    </Frame>
  );
}

export function EventUnit({
  event,
}: {
  event: {
    id: string;
    title: string;
    date: string;
    location: string;
    goingCount: number;
  };
}) {
  return (
    <Frame title="Po ndodh te ti">
      <Link
        href={`/eventet/${event.id}`}
        className="flex items-start gap-3 rounded-md p-2 transition-colors duration-150 hover:bg-surface-2"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-md bg-success/12 text-success-text">
          <CalendarDays className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-medium text-text">{event.title}</span>
          <span className="truncate text-xs text-text-muted">
            {formatEventDate(event.date)} · {event.location}
          </span>
          <span className="tabular inline-flex items-center gap-1 text-xs text-text-muted">
            <Users className="size-3" />
            {event.goingCount} po shkojnë
          </span>
        </span>
      </Link>
    </Frame>
  );
}
