"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { FollowButton } from "@/components/social/follow-button";
import type { PersonFromYear } from "@/lib/queries/people";

/**
 * Profile të sugjeruara, si listë me butona ndjekjeje.
 *
 * Renditja vjen nga serveri: i njëjti program i pari, pastaj fakulteti, pastaj
 * universiteti dhe viti. Butoni e ndryshon gjendjen vetë, sepse te profilet
 * private ndjekja nis si kërkesë dhe studenti duhet ta dijë që u dërgua.
 */
export function SuggestedPeople({
  people,
  emptyTitle,
}: {
  people: PersonFromYear[];
  emptyTitle: string;
}) {
  const ta = useTranslations("academic");

  if (people.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-4 text-sm text-text-muted">
        {emptyTitle}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {people.map((person) => {
        const meta = [
          person.universityAbbr,
          person.facultyName,
          person.programName,
          person.year ? ta("yearValue", { year: person.year }) : null,
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <li
            key={person.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"
          >
            <Link href={`/u/${person.username}`} className="shrink-0">
              <Avatar name={person.name} src={person.avatar} size="lg" />
            </Link>

            <div className="flex min-w-0 flex-1 flex-col">
              <Link href={`/u/${person.username}`} className="truncate text-sm font-semibold text-text hover:underline">
                {person.name}
              </Link>
              <span className="truncate text-xs text-text-muted">@{person.username}</span>
              {meta ? <span className="truncate text-xs text-text-muted">{meta}</span> : null}
            </div>

            <FollowButton
              targetId={person.id}
              initialState={person.relation}
              quiet
              className="shrink-0"
            />
          </li>
        );
      })}
    </ul>
  );
}
