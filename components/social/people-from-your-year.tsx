"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { FollowButton } from "@/components/social/follow-button";
import type { PersonFromYear } from "@/lib/queries/people";

/**
 * Njerëz nga viti yt, në krye të ballinës.
 *
 * Rresht i vetëm që rrëshqet anash, jo mur me fytyra: qëllimi është të njohësh
 * dy a tri emra nga gjenerata, jo të shfletosh një katalog. Ndjekja nis si
 * kërkesë, prandaj butoni e thotë hapur kur kërkesa është dërguar.
 */
export function PeopleFromYourYear({ people }: { people: PersonFromYear[] }) {
  const t = useTranslations("social");
  const tc = useTranslations("common");

  if (people.length === 0) return null;

  return (
    <section className="flex flex-col gap-2" aria-labelledby="njerez-nga-viti">
      <div className="flex items-center justify-between gap-2">
        <h2 id="njerez-nga-viti" className="text-xs font-bold uppercase tracking-wider text-text">
          {t("peopleFromYourYear")}
        </h2>
        <Link
          href="/komuniteti"
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-500 hover:underline"
        >
          {tc("seeAll")}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <ul className="-mx-4 flex snap-x gap-2 overflow-x-auto scrollbar-none px-4 sm:mx-0 sm:px-0">
        {people.map((person) => (
          <li key={person.id} className="w-40 shrink-0 snap-start">
              <Card className="flex h-full flex-col items-center gap-2 p-3 text-center">
                <Link href={`/u/${person.username}`} className="flex flex-col items-center gap-1.5">
                  <Avatar name={person.name} src={person.avatar} size="md" />
                  <span className="line-clamp-1 text-sm font-medium text-text">{person.name}</span>
                  <span className="line-clamp-1 text-xs text-text-muted">@{person.username}</span>
                </Link>

                <p className="line-clamp-2 text-[11px] leading-tight text-text-muted">
                  {person.programName ?? person.facultyName ?? ""}
                </p>

                <FollowButton
                  targetId={person.id}
                  initialState={person.relation}
                  quiet
                  className="mt-auto w-full min-w-0"
                />
              </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
