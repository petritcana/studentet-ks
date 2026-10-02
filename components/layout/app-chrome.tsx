"use client";

import { ReviewBar, ReviewProvider, useReviewGuardFor, type ReviewState } from "@/components/layout/review-state";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/layout/brand";
import { DemoBar, type DemoAccount } from "@/components/layout/demo-bar";
import { GlobalSearch } from "@/components/layout/global-search";
import { AccountMenu } from "@/components/layout/account-menu";
import { MessagesPanel } from "@/components/layout/messages-panel";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { AssistantDock } from "@/components/assistant/assistant-dock";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { PresenceHeartbeat } from "@/components/social/presence-heartbeat";
import { ComposerProvider, type ComposerAttachment } from "@/components/feed/composer-context";
import { CallProvider } from "@/components/messages/call-provider";
import { PostComposer } from "@/components/feed/post-composer";
import { isActive, MOBILE_NAV, PRIMARY_NAV, type NavItem } from "./nav-items";
import type { PostScope } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ChromeUser = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  role: string;
  isPro: boolean;
  isVerified: boolean;
  xp: number;
  review?: ReviewState;
};

export function AppChrome({
  user,
  scopeOptions,
  unreadNotifications,
  unreadMessages,
  navCounts = {},
  demo,
  sidebar,
  assistantLabel,
  children,
}: {
  user: ChromeUser;
  scopeOptions: { scope: PostScope; allowed: boolean }[];
  unreadNotifications: number;
  unreadMessages: number;
  /** Sa gjëra të reja ka këtë javë pas zërit të shtyllës, sipas adresës së tij. */
  navCounts?: Record<string, number>;
  demo: { accounts: DemoAccount[]; proOverride: "free" | "pro" | null } | null;
  /** Hapësira jonë, reklama dhe punët, të renderuara në server. */
  sidebar: React.ReactNode;
  /** A punon asistenti pa çelës modeli. Vendoset në server: klienti nuk i sheh çelësat. */
  /** Emri i modelit (Groq), ose null kur asistenti është demonstrues. */
  assistantLabel: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tm = useTranslations("meta");
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [composerType, setComposerType] = React.useState<ComposerAttachment | undefined>();
  const reviewGuard = useReviewGuardFor(user.review ?? null);

  // Një kontroll i vetëm për te gjithë nxitesit: shtylla, navigimi i poshtem dhe
  // nxitesi mbi feed. Referenca mbetet e njejta, që faqet te mos rirenderohen.
  const composer = React.useMemo(
    () => ({
      open: (type?: ComposerAttachment) => {
        // Llogaria në shqyrtim nuk poston ende: shpjegimi, jo një formular që s'dërgohet.
        if (reviewGuard()) return;
        setComposerType(type);
        setComposerOpen(true);
      },
    }),
    [reviewGuard],
  );

  return (
    <div className="relative isolate min-h-dvh">
      {/* Dritat blu pas gjithçkaje (`--bgfx`), në të dy temat. Sfondi bazë vjen nga body. */}
      <div aria-hidden className="aurora">
        <span />
        <span />
        <span />
        <span />
      </div>

      <React.Suspense fallback={null}>
        <NavigationProgress />
      </React.Suspense>

      {demo ? (
        <DemoBar
          currentName={user.name}
          accounts={demo.accounts}
          proOverride={demo.proOverride}
          isProNow={user.isPro}
        />
      ) : null}

      <header className="sticky top-0 z-40 border-b border-border bg-header backdrop-blur-[26px] backdrop-saturate-150">
        <div className="flex h-16 w-full items-center gap-2 px-4 sm:gap-4 sm:px-6 lg:h-[72px] lg:px-10">
          {/*
            Majtas rri vetëm logoja.

            Rreshti me @username dhe statusin u hoq: emri i përdoruesit dhe
            statusi jetojnë te menyja e avatarit dhe te profili, dhe këtu vetëm
            e ngushtonin kërkimin pa i thënë studentit asgjë që nuk e di.
          */}
          <div className="flex shrink-0 items-center">
            <BrandLogo href="/feed" label={tm("name")} ariaLabel={tm("name")} showText={true} />
          </div>

          <GlobalSearch className="min-w-0 flex-1 sm:mx-auto sm:max-w-2xl" />

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
            <MessagesPanel initialUnread={unreadMessages} />
            <NotificationBell initialUnread={unreadNotifications} />
            <ThemeToggle className="hidden lg:inline-flex" />
            <LocaleSwitcher />
            <AccountMenu
              name={user.name}
              username={user.username}
              avatar={user.avatar}
              role={user.role}
              xp={user.xp}
            />
          </div>
        </div>
      </header>

      {/* Faqja zë tërë gjerësinë e ekranit: asnjë kufi në mes që lë hapësira bosh anash. */}
      <div className="flex w-full items-start gap-6 px-4 sm:px-6 lg:gap-10 lg:px-10">
        {/*
          Navigimi rri lart dhe shtylla ndjek faqen me shiritin e vet të fshehur:
          njoftimet, reklama dhe punët lexohen pa e humbur navigimin nga sytë.
        */}
        <aside className="sticky top-[72px] hidden max-h-[calc(100dvh-72px)] w-[280px] shrink-0 flex-col gap-4 overflow-y-auto scrollbar-none py-6 lg:flex xl:w-[300px]">
          <div className="flex flex-col">
            <nav aria-label={t("primary")} className="flex flex-col gap-[3px]">
              {PRIMARY_NAV.map((item) => (
                <SidebarLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  label={t(item.key)}
                  count={navCounts[item.href] ?? 0}
                  countLabel={t("newThisWeek", { count: navCounts[item.href] ?? 0 })}
                />
              ))}
            </nav>

            <Button size="lg" className="mt-[18px] h-[52px] w-full font-display text-base font-bold" onClick={() => composer.open()}>
              <Plus />
              {t("compose")}
            </Button>
          </div>

          {sidebar}

          {!user.isPro ? (
            <div className="glass flex flex-col gap-2 rounded-card p-[18px]">
              <p className="text-sm font-semibold text-text">{t("proCardTitle")}</p>
              <p className="text-xs leading-relaxed text-text-muted">{t("proCardBody")}</p>
              <Button asChild variant="pro" size="sm">
                <Link href="/une/pro">{t("proCardCta")}</Link>
              </Button>
            </div>
          ) : null}
        </aside>

        <main id="permbajtja" className="min-w-0 flex-1 py-4 pb-24 sm:py-6 lg:pb-10">
          {/* Thirrjet jetojnë mbi çdo faqe: zilja del kudo, dhe thirrja nuk mbyllet kur ndërron faqe. */}
          <ReviewBar state={user.review ?? null} />
          <ReviewProvider state={user.review ?? null}>
            <CallProvider me={{ id: user.id, name: user.name, avatar: user.avatar }}>
              <ComposerProvider value={composer}>{children}</ComposerProvider>
            </CallProvider>
          </ReviewProvider>
        </main>
      </div>

      <nav
        aria-label={t("mobile")}
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-header pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        {MOBILE_NAV.slice(0, 2).map((item) => (
          <BottomLink key={item.href} item={item} pathname={pathname} label={t(item.key)} />
        ))}

        <button
          type="button"
          onClick={() => composer.open()}
          aria-label={t("compose")}
          className="grid size-11 shrink-0 place-items-center rounded-control bg-primary bg-primary-grad text-on-primary shadow-cta transition-transform duration-150 ease-brand active:scale-95 hover:brightness-110"
        >
          <Plus className="size-5" />
        </button>

        {MOBILE_NAV.slice(2).map((item) => (
          <BottomLink key={item.href} item={item} pathname={pathname} label={t(item.key)} />
        ))}
      </nav>

      <PostComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        user={{ name: user.name, avatar: user.avatar }}
        scopeOptions={scopeOptions}
        initialAttachment={composerType}
      />

      <PresenceHeartbeat />
      <AssistantDock isPro={user.isPro} label={assistantLabel} />
      {/* «Raporto»: çdo testues u shkruan adminëve për probleme ose sugjerime, nga çdo faqe. */}
      <FeedbackButton />
    </div>
  );
}

function SidebarLink({
  item,
  pathname,
  label,
  count = 0,
  countLabel,
}: {
  item: NavItem;
  pathname: string;
  label: string;
  count?: number;
  countLabel?: string;
}) {
  const active = isActive(pathname, item);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-[46px] items-center gap-3.5 rounded-control px-4 text-[15px] font-semibold",
        "transition-colors duration-150 ease-out",
        active
          ? "bg-nav-active text-text ring-1 ring-inset ring-[var(--nav-active-ring)]"
          : "text-text-muted hover:bg-surface-2 hover:text-text",
      )}
    >
      <Icon className={cn("size-[19px] shrink-0", active && "text-nav-active-icon")} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {/* Numri lexohet me një shikim: pilulë e plotë me kontrast të fortë, jo gri e zbehtë. */}
      {count > 0 ? (
        <span
          className="tabular grid h-6 min-w-6 place-items-center rounded-full bg-count px-2 text-xs font-bold text-on-count"
          title={countLabel}
          aria-label={countLabel}
          data-nav-count
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

function BottomLink({
  item,
  pathname,
  label,
}: {
  item: NavItem;
  pathname: string;
  label: string;
}) {
  const active = isActive(pathname, item);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-w-16 flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-[11px] font-medium",
        "transition-colors duration-150 ease-brand",
        active ? "text-text [&_svg]:text-brand-500" : "text-text-muted",
      )}
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );
}
