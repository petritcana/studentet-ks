import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("offlineTitle"), robots: { index: false, follow: false } };
}

/** Faqja që sherbetori i punes shfaq kur rrjeti mungon. */
export default async function OfflinePage() {
  const [t, tc] = await Promise.all([getTranslations("meta"), getTranslations("common")]);

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-surface-2 text-text-muted">
          <WifiOff className="size-6" />
        </span>
        <h1 className="text-xl font-semibold tracking-tight text-text">{t("offlineTitle")}</h1>
        <p className="measure text-sm text-text-muted">{t("offlineBody")}</p>
        <Button asChild>
          <Link href="/feed">{tc("retry")}</Link>
        </Button>
      </div>
    </main>
  );
}
