"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { MediaPicker } from "@/components/feed/media-picker";
import { createListing } from "@/lib/actions/market";
import { MARKET_CATEGORIES, MARKET_CONDITIONS, MAX_LISTING_PHOTOS, parsePrice, type MarketCategory, type MarketCondition } from "@/lib/market";
import type { MediaRef } from "@/lib/media";
import { cn } from "@/lib/utils";

export function ListingForm({ defaultCity }: { defaultCity: string }) {
  const router = useRouter();
  const t = useTranslations("market");
  const tc = useTranslations("common");

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [free, setFree] = React.useState(false);
  const [category, setCategory] = React.useState<MarketCategory>("books");
  const [condition, setCondition] = React.useState<MarketCondition>("used");
  const [city, setCity] = React.useState(defaultCity);
  const [media, setMedia] = React.useState<MediaRef[]>([]);
  const [pending, startTransition] = React.useTransition();

  const priceCents = free ? null : parsePrice(price);
  const priceInvalid = !free && (Number.isNaN(priceCents) || priceCents === null);
  const ready = title.trim().length >= 3 && description.trim().length >= 10 && city.trim().length >= 2 && !priceInvalid;

  function submit() {
    startTransition(async () => {
      const result = await createListing({
        title,
        description,
        priceCents: free ? null : (priceCents as number),
        category,
        condition,
        city,
        media: media.filter((item) => item.kind === "image").map((item) => ({ ...item, kind: "image" as const, durationMs: null })),
      });
      if (!result.ok || !result.id) {
        toast.error(result.messageKey === "market.tooMany" ? t("tooMany") : tc("retry"));
        return;
      }
      toast.success(t("published"));
      router.push(`/tregu/${result.id}`);
    });
  }

  const pill = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150",
      active ? "border-brand-500 bg-brand-500/12 text-brand-500" : "border-border bg-surface text-text-muted hover:text-text",
    );

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-col gap-1.5">
        <Label>{t("photos")}</Label>
        <MediaPicker media={media} onChange={setMedia} max={MAX_LISTING_PHOTOS} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="listing-title">{t("titleLabel")}</Label>
        <Input id="listing-title" value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} placeholder={t("titlePlaceholder")} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="listing-description">{t("description")}</Label>
        <Textarea
          id="listing-description"
          value={description}
          maxLength={1000}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t("descriptionPlaceholder")}
          className="min-h-24"
        />
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-sm font-medium text-text">{t("category")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {MARKET_CATEGORIES.map((value) => (
            <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)} className={pill(category === value)}>
              {t(`category_${value}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-sm font-medium text-text">{t("condition")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {MARKET_CONDITIONS.map((value) => (
            <button key={value} type="button" aria-pressed={condition === value} onClick={() => setCondition(value)} className={pill(condition === value)}>
              {t(`condition_${value}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="listing-price">{t("price")}</Label>
          <Input
            id="listing-price"
            inputMode="decimal"
            value={free ? "" : price}
            disabled={free}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="15"
          />
          <label className="flex items-center gap-2 text-xs text-text-muted">
            <input type="checkbox" checked={free} onChange={(event) => setFree(event.target.checked)} className="accent-brand-500" />
            {t("giveAway")}
          </label>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="listing-city">{t("city")}</Label>
          <Input id="listing-city" value={city} maxLength={40} onChange={(event) => setCity(event.target.value)} />
        </div>
      </div>

      <Button onClick={submit} loading={pending} disabled={!ready} className="self-start">
        {t("publish")}
      </Button>
    </Card>
  );
}
