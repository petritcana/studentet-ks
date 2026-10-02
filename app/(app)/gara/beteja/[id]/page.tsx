import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BattlePlayer } from "@/components/competition/battle-player";
import { battleView } from "@/lib/competition/battles";
import { maintainCompetition } from "@/lib/competition/dashboard";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("competition");
  return { title: t("modeRandom") };
}

export const dynamic = "force-dynamic";

/** Një betejë: sfida, loja, pritja dhe rezultati, në një faqe. */
export default async function BattlePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, me] = await Promise.all([params, requireUser()]);
  await maintainCompetition();
  const view = await battleView({ id: me.id, isVerified: me.isVerified, universityId: me.universityId }, id);
  if (!view) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <BattlePlayer initial={view} meId={me.id} />
    </div>
  );
}
