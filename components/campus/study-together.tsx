"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Check, Clock, MapPin, Plus, Users } from "lucide-react";
import { AvatarStack } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { EmptyState } from "@/components/shared/empty-state";
import { createStudySession, toggleStudyJoin } from "@/lib/actions/study";
import { formatDateShort, formatTime } from "@/lib/format";

export type StudySessionDto = {
  id: string;
  title: string;
  place: string;
  startsAt: string;
  capacity: number | null;
  note: string | null;
  courseName: string | null;
  authorName: string;
  joined: boolean;
  joiners: { name: string; avatar: string | null }[];
};

/**
 * "Studio bashkë".
 *
 * Forma është tri fusha, jo tetë: nëse krijimi zgjat më shumë se tridhjetë
 * sekonda, askush nuk e përdor kur po nis të mësojë.
 */
export function StudyTogether({ sessions }: { sessions: StudySessionDto[] }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("study");
  const tc = useTranslations("common");

  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [place, setPlace] = React.useState("");
  const [startsAt, setStartsAt] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function create() {
    startTransition(async () => {
      const result = await createStudySession({ title, place, startsAt });
      if (!result.ok) {
        toast.error(tc("retry"));
        return;
      }
      toast.success(t("created"));
      setTitle("");
      setPlace("");
      setStartsAt("");
      setOpen(false);
      router.refresh();
    });
  }

  function join(id: string) {
    startTransition(async () => {
      const result = await toggleStudyJoin(id);
      if (!result.ok) {
        toast.error(result.messageKey === "study.errorFull" ? t("errorFull") : tc("retry"));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="text-sm font-semibold text-text">{t("title")}</h2>
          <p className="measure text-xs text-text-muted">{t("body")}</p>
        </div>
        <Button size="sm" variant={open ? "secondary" : "primary"} onClick={() => setOpen(!open)}>
          <Plus />
          {t("create")}
        </Button>
      </div>

      {open ? (
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="study-title">{t("what")}</Label>
            <Input
              id="study-title"
              maxLength={120}
              placeholder={t("whatPlaceholder")}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="study-place">{t("where")}</Label>
              <Input
                id="study-place"
                maxLength={120}
                placeholder={t("wherePlaceholder")}
                value={place}
                onChange={(event) => setPlace(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="study-when">{t("when")}</Label>
              <Input
                id="study-when"
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={create}
            loading={pending}
            disabled={!title || !place || !startsAt}
            className="self-start"
          >
            {t("publish")}
          </Button>
        </Card>
      ) : null}

      {sessions.length === 0 ? (
        <EmptyState illustration="people" compact title={t("empty")} />
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((session) => (
            <li key={session.id}>
              <Card className="flex flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-text">
                    {session.title}
                  </p>
                  {session.courseName ? (
                    <Badge variant="brand">{session.courseName}</Badge>
                  ) : null}
                </div>

                <p className="tabular flex flex-wrap items-center gap-x-3 text-xs text-text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatDateShort(session.startsAt, locale)} {formatTime(session.startsAt)}
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPin className="size-3 shrink-0" />
                    <span className="truncate">{session.place}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3" />
                    {session.joiners.length}
                    {session.capacity ? ` / ${session.capacity}` : ""}
                  </span>
                </p>

                <div className="flex flex-wrap items-center gap-3 border-t border-border pt-2">
                  {session.joiners.length > 0 ? (
                    <AvatarStack people={session.joiners} size="xs" max={5} />
                  ) : null}

                  <Button
                    size="sm"
                    variant={session.joined ? "secondary" : "outline"}
                    onClick={() => join(session.id)}
                    className="ml-auto"
                  >
                    {session.joined ? <Check /> : null}
                    {session.joined ? t("joined") : t("join")}
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
