"use client";

import * as React from "react";
import { MediaImage } from "@/components/ui/media-image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ExternalLink, Info, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import { trackAdClick } from "@/lib/actions/posts";
import type { AdDto } from "@/lib/dto";

/**
 * Reklamë vendase.
 *
 * Duket si kartë e feed-it, por është gjithmonë e etiketuar dhe kurrë e maskuar
 * si postim. Nuk shfaqet për përdorues Pro, në DM, te shikuesi i dokumentit ose
 * te asistenti: atë vendim e merr `shouldSeeAds`, jo ky komponent.
 */
export function AdCard({ ad }: { ad: AdDto }) {
  const t = useTranslations("ads");
  // «Pse e shoh?» hapet edhe me prekje: në telefon kalimi i miut nuk ekziston.
  const [why, setWhy] = React.useState(false);

  function click() {
    void trackAdClick(ad.id);
  }

  return (
    <Card data-ad-card className="flex flex-col gap-3 border-dashed p-4 sm:p-5">
      <header className="flex items-center gap-2">
        <Badge variant="neutral">{t("label")}</Badge>
        <span className="truncate text-xs text-text-muted">
          {t("sponsored", { advertiser: ad.advertiser })}
        </span>

        <Tooltip label={t("whyBody")}>
          <button
            type="button"
            aria-label={t("why")}
            aria-expanded={why}
            onClick={() => setWhy((value) => !value)}
            data-ad-why
            className="ml-auto grid size-7 shrink-0 place-items-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <Info className="size-3.5" />
          </button>
        </Tooltip>
      </header>

      {why ? (
        <p className="rounded-control bg-surface-2 px-3 py-2 text-xs text-text-muted" data-ad-why-body>
          {t("whyBody")}
        </p>
      ) : null}

      {ad.image ? (
        <div className="relative aspect-[16/7] overflow-hidden rounded-md bg-surface-2">
          <MediaImage
            src={ad.image}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 600px"
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-text">{ad.title}</p>
        <p className="measure text-pretty text-sm text-text-muted">{ad.body}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Button asChild size="sm" variant="secondary" onClick={click}>
          <a href={ad.url} target="_blank" rel="noopener noreferrer nofollow sponsored">
            {ad.cta}
            <ExternalLink />
          </a>
        </Button>
        <Button asChild size="sm" variant="ghost" className="ml-auto">
          <Link href="/une/pro">
            <Sparkles />
            {t("hide")}
          </Link>
        </Button>
      </div>
    </Card>
  );
}
