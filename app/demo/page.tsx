import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { BrandLogo } from "@/components/layout/brand";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserIdentityLine } from "@/components/identity/user-identity-line";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { demoSignIn } from "@/lib/actions/auth";
import { isDemoMode } from "@/lib/auth";
import { db } from "@/lib/db";
import { isPro } from "@/lib/access";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("demo");
  return { title: t("title"), description: t("body"), robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/** Çelësat e etiketave, që katalogu të mos ketë emra me viza. */
const LABEL_KEYS: Record<string, { label: string; description: string }> = {
  "free-new": { label: "labelFreeNew", description: "descFreeNew" },
  "free-verified": { label: "labelFreeVerified", description: "descFreeVerified" },
  "pro-paid": { label: "labelProPaid", description: "descProPaid" },
  "pro-earned": { label: "labelProEarned", description: "descProEarned" },
  "free-rich-xp": { label: "labelFreeRichXp", description: "descFreeRichXp" },
  "course-leader": { label: "labelCourseLeader", description: "descCourseLeader" },
  moderator: { label: "labelModerator", description: "descModerator" },
  admin: { label: "labelAdmin", description: "descAdmin" },
  company: { label: "labelCompany", description: "descCompany" },
};

const ORDER = Object.keys(LABEL_KEYS);

export default async function DemoPage() {
  if (!isDemoMode) notFound();

  const [t, tm, locale] = await Promise.all([
    getTranslations("demo"),
    getTranslations("meta"),
    getTranslations("identity"),
  ]);

  const accounts = await db.user.findMany({
    where: { demoLabel: { not: null } },
    select: {
      id: true,
      name: true,
      username: true,
      avatar: true,
      isVerified: true,
      year: true,
      role: true,
      demoLabel: true,
      proEarnedUntil: true,
      universityId: true,
      facultyId: true,
      university: { select: { abbr: true } },
      faculty: { select: { name: true, nameEn: true, color: true } },
      subscriptions: { where: { status: "active" }, select: { status: true, expiresAt: true } },
    },
  });

  const sorted = accounts.sort(
    (a, b) => ORDER.indexOf(a.demoLabel ?? "") - ORDER.indexOf(b.demoLabel ?? ""),
  );

  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <BrandLogo label={tm("name")} ariaLabel={tm("homeLink")} />
          <div className="flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="permbajtja" className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-2xl text-text">{t("title")}</h1>
          <p className="measure text-sm text-text-muted">{t("body")}</p>
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-warning/30 bg-warning/8 px-3 py-1 text-xs text-warning-text">
            <ShieldAlert className="size-3.5" />
            {t("note")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sorted.map((account) => {
            const keys = LABEL_KEYS[account.demoLabel ?? ""] ?? LABEL_KEYS["free-new"];
            const pro = isPro({
              id: account.id,
              role: account.role,
              universityId: account.universityId,
              facultyId: account.facultyId,
              proEarnedUntil: account.proEarnedUntil,
              subscriptions: account.subscriptions,
            });

            return (
              <Card key={account.id} className="flex flex-col gap-3 p-4">
                <UserIdentityLine
                  user={{
                    name: account.name,
                    username: account.username,
                    avatar: account.avatar,
                    isVerified: account.isVerified,
                    isPro: pro,
                    universityAbbr: account.university?.abbr ?? null,
                    facultyCode: account.faculty?.color ?? null,
                    facultyLabel: account.faculty?.name ?? null,
                    year: account.year,
                  }}
                />

                <Badge variant={pro ? "brand" : "neutral"} className="w-fit">
                  {t(keys.label)}
                </Badge>

                <p className="text-xs text-text-muted">{t(keys.description)}</p>

                <form
                  action={async () => {
                    "use server";
                    await demoSignIn(account.id);
                  }}
                  className="mt-auto"
                >
                  <Button type="submit" size="sm" className="w-full">
                    {t("enter")}
                    <ArrowRight />
                  </Button>
                </form>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-text-muted">
          {locale("verifiedTooltip")} · {locale("proTooltip")}
        </p>
      </main>
    </div>
  );
}
