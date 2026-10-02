import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PostAnalyticsPanel } from "@/components/pro/post-analytics-panel";
import { getPostAnalytics } from "@/lib/queries/analytics";
import { hasFeature } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("analytics");
  return { title: t("title"), description: t("subtitle") };
}

/**
 * Analitika e postimeve.
 *
 * Rri te llogaria, jo te çdo postim: numrat kanë kuptim kur shihen bashkë, dhe
 * një ikonë grafiku mbi çdo kartë do ta kthente feed-in në panel matjesh.
 */
export default async function AnalyticsPage() {
  const me = await requireUser();
  const t = await getTranslations("analytics");

  if (!hasFeature(me.actor, "post_analytics")) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 py-6">
        <h1 className="font-serif text-2xl text-text">{t("title")}</h1>
        <Card className="flex flex-col items-start gap-3 p-5">
          <span className="grid size-10 place-items-center rounded-md bg-surface-2 text-text-muted">
            <Lock className="size-5" />
          </span>
          <p className="measure text-sm text-text-muted">{t("locked")}</p>
          <Button asChild size="sm">
            <Link href="/une/pro">
              {t("lockedCta")}
              <ArrowRight />
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  const data = await getPostAnalytics({
    id: me.id,
    universityId: me.universityId,
    facultyId: me.facultyId,
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl text-text">{t("title")}</h1>
        <p className="measure text-sm text-text-muted">{t("subtitle")}</p>
      </header>

      <PostAnalyticsPanel data={data} />
    </div>
  );
}
