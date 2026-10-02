"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { findOpponentFor } from "@/lib/actions/competition";
import { CATEGORY_ICON, COMPETITION_CATEGORIES, type CompetitionCategory } from "@/lib/competition/categories";
import { cn } from "@/lib/utils";
import { ChallengeDialog } from "./challenge-dialog";

/**
 * Beteja e shpejtë: kategoria, pastaj «Gjej kundërshtar» ose «Sfido një shok».
 * Kategoritë e studimeve të studentit dalin të parat, pa ia mbyllur të tjerat.
 */
export function CategoryPicker({ suggested }: { suggested: CompetitionCategory[] }) {
  const router = useRouter();
  const t = useTranslations("competition");
  const errors = useTranslations("errors");
  const [category, setCategory] = React.useState<CompetitionCategory>(suggested[0] ?? "general");
  const [showAll, setShowAll] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const visible = showAll ? COMPETITION_CATEGORIES : suggested;

  function find() {
    startTransition(async () => {
      const result = await findOpponentFor(category);
      if (!result.ok || !result.battleId) {
        const key = result.messageKey ?? "";
        toast.error(key.startsWith("competition.") ? t(key.replace("competition.", "")) : errors("generic"));
        return;
      }
      router.push(`/gara/beteja/${result.battleId}`);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-text-muted">{showAll ? t("allCategories") : t("suggested")}</p>
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-500"
        >
          {showAll ? t("suggested") : t("allCategories")}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={t("chooseCategory")}>
        {visible.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={category === value}
            data-category={value}
            onClick={() => setCategory(value)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all duration-150",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
              category === value
                ? "border-brand-500 bg-brand-500/10 shadow-soft"
                : "border-border bg-surface hover:-translate-y-0.5 hover:border-brand-500/40",
            )}
          >
            <span className="text-lg" aria-hidden>
              {CATEGORY_ICON[value]}
            </span>
            <span className="text-xs font-semibold leading-tight text-text">{t(`cat_${value}`)}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={find} loading={pending} data-find-opponent>
          <Search />
          {t("findOpponent")}
        </Button>
        <ChallengeDialog defaultCategory={category} />
      </div>
    </div>
  );
}
