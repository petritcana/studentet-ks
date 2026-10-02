"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Swords } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { challengeCandidates, challengeStudent } from "@/lib/actions/competition";
import { COMPETITION_CATEGORIES, CATEGORY_ICON, type CompetitionCategory } from "@/lib/competition/categories";
import { cn } from "@/lib/utils";

type Candidate = Awaited<ReturnType<typeof challengeCandidates>>[number];

/**
 * «Sfido një shok»: kategoria dhe studenti. Lista vjen nga ata që ndjek ose që e
 * ndjekin, sepse sfida drejt një të panjohuri do të ishte zhurmë, jo garë.
 */
export function ChallengeDialog({
  defaultCategory = "general",
  trigger,
}: {
  defaultCategory?: CompetitionCategory;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations("competition");
  const errors = useTranslations("errors");
  const [open, setOpen] = React.useState(false);
  const [category, setCategory] = React.useState<CompetitionCategory>(defaultCategory);
  const [query, setQuery] = React.useState("");
  const [people, setPeople] = React.useState<Candidate[] | null>(null);
  const [pending, startTransition] = React.useTransition();

  // Sa herë hapet, dritarja merr kategorinë që studenti sapo zgjodhi te faqja.
  React.useEffect(() => {
    if (open) setCategory(defaultCategory);
  }, [open, defaultCategory]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const found = await challengeCandidates(query);
      if (!cancelled) setPeople(found);
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query]);

  function send(person: Candidate) {
    startTransition(async () => {
      const result = await challengeStudent(person.username, category);
      if (!result.ok || !result.battleId) {
        const key = result.messageKey ?? "";
        toast.error(key.startsWith("competition.") ? t(key.replace("competition.", "")) : errors("generic"));
        return;
      }
      toast.success(t("challengeSent"));
      setOpen(false);
      router.push(`/gara/beteja/${result.battleId}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="secondary">
            <Swords />
            {t("challengeFriend")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("challengeTitle")}</DialogTitle>
          <DialogDescription>{t("challengeBody")}</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("chooseCategory")}>
            {COMPETITION_CATEGORIES.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={category === value}
                onClick={() => setCategory(value)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-150",
                  category === value
                    ? "border-brand-500 bg-brand-500/10 text-text"
                    : "border-border text-text-muted hover:text-text",
                )}
              >
                <span aria-hidden>{CATEGORY_ICON[value]}</span> {t(`cat_${value}`)}
              </button>
            ))}
          </div>

          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("challengeSearch")}
            aria-label={t("challengeSearch")}
          />

          <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto scrollbar-thin" data-challenge-list>
            {people === null ? (
              Array.from({ length: 3 }, (_, index) => (
                <li key={index} className="h-12 shimmer rounded-xl bg-surface-2" />
              ))
            ) : people.length === 0 ? (
              <li className="px-2 py-6 text-center text-sm text-text-muted">{t("noFriends")}</li>
            ) : (
              people.map((person) => (
                <li key={person.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2">
                  <Avatar name={person.name} src={person.avatar} size="sm" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-text">{person.name}</span>
                    <span className="truncate text-xs text-text-muted">
                      @{person.username}
                      {person.university ? ` · ${person.university}` : ""}
                    </span>
                  </span>
                  <Button size="sm" onClick={() => send(person)} loading={pending} aria-label={`${t("challengeSend")}: ${person.name}`}>
                    <Swords />
                    {t("challengeSend")}
                  </Button>
                </li>
              ))
            )}
          </ul>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
