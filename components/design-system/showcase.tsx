"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { BrandLogo } from "@/components/layout/brand";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { SectionControls } from "./section-controls";
import { SectionFoundations } from "./section-foundations";
import { SectionSurfaces } from "./section-surfaces";
import { cn } from "@/lib/utils";

const NAV = [
  { id: "ngjyrat", key: "colors" },
  { id: "kontrasti", key: "contrast" },
  { id: "tipografia", key: "typography" },
  { id: "hapesira", key: "space" },
  { id: "identiteti", key: "identity" },
  { id: "butonat", key: "buttons" },
  { id: "format", key: "forms" },
  { id: "tabs", key: "tabs" },
  { id: "kartat", key: "cards" },
  { id: "pro", key: "pro" },
  { id: "mbivendosjet", key: "overlays" },
  { id: "progresi", key: "feedback" },
  { id: "skeleton", key: "skeletons" },
  { id: "gjendjet-boshe", key: "empty" },
] as const;

/** Tregon gjerësinë aktuale, që të verifikohet sjellja nga 320px deri 1920px. */
function ViewportMeter() {
  const t = useTranslations("designSystem");
  const [width, setWidth] = React.useState<number | null>(null);

  React.useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (width === null) return null;

  const band =
    width < 480 ? "phone" : width < 768 ? "phoneLarge" : width < 1024 ? "tablet" : "desktop";

  return (
    <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-text-muted sm:inline-flex">
      <span className="tabular text-text">{width}px</span>
      <span aria-hidden>·</span>
      <span>{t(`band.${band}`)}</span>
    </span>
  );
}

function SectionNav() {
  const t = useTranslations("designSystem");
  const [active, setActive] = React.useState<string>(NAV[0].id);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    );

    for (const item of NAV) {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label={t("nav")} className="w-full">
      <ul className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin lg:flex-col lg:overflow-visible lg:pb-0">
        {NAV.map((item) => (
          <li key={item.id} className="shrink-0 lg:shrink">
            <a
              href={`#${item.id}`}
              aria-current={active === item.id ? "true" : undefined}
              className={cn(
                "block whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors duration-150 ease-brand lg:rounded-sm",
                active === item.id
                  ? "bg-brand-500/12 font-medium text-brand-500"
                  : "text-text-muted hover:bg-surface hover:text-text",
              )}
            >
              {t(`sections.${item.key}`)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Showcase() {
  const t = useTranslations("designSystem");
  const tm = useTranslations("meta");

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6">
          <BrandLogo label={tm("name")} ariaLabel={tm("homeLink")} showText={false} />
          <div className="flex min-w-0 flex-1 items-baseline gap-3">
            <span className="truncate font-serif text-xl text-text">{t("title")}</span>
            <span className="hidden truncate text-xs text-text-muted md:inline">
              {t("eyebrow")}
            </span>
          </div>
          <ViewportMeter />
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:gap-10 lg:py-12">
        <aside className="lg:sticky lg:top-24 lg:h-fit lg:w-52 lg:shrink-0">
          <SectionNav />
        </aside>

        <main id="permbajtja" className="flex min-w-0 flex-1 flex-col gap-12">
          <div className="flex flex-col gap-3">
            <h1 className="font-serif text-3xl text-text">{t("heading")}</h1>
            <p className="measure text-sm text-text-muted">{t("intro")}</p>
          </div>

          <SectionFoundations />
          <SectionControls />
          <SectionSurfaces />

          <footer className="border-t border-border pt-8 text-xs text-text-muted">
            {t("footer")}
          </footer>
        </main>
      </div>
    </div>
  );
}
