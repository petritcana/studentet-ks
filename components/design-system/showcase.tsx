"use client";

import * as React from "react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { cn } from "@/lib/utils";
import { SectionControls } from "./section-controls";
import { SectionFoundations } from "./section-foundations";
import { SectionSurfaces } from "./section-surfaces";

const NAV = [
  { id: "ngjyrat", label: "Ngjyrat" },
  { id: "kontrasti", label: "Kontrasti" },
  { id: "tipografia", label: "Tipografia" },
  { id: "hapesira", label: "Hapësira" },
  { id: "butonat", label: "Butonat" },
  { id: "format", label: "Format" },
  { id: "tabs", label: "Tabs" },
  { id: "kartat", label: "Kartat" },
  { id: "avataret", label: "Avatarët" },
  { id: "badge", label: "Badge" },
  { id: "mbivendosjet", label: "Mbivendosjet" },
  { id: "progresi", label: "Progresi" },
  { id: "skeleton", label: "Skeleton" },
  { id: "gjendjet-boshe", label: "Gjendjet boshe" },
  { id: "njoftimet", label: "Njoftimet" },
];

/** Tregon gjerësinë aktuale, që të verifikohet sjellja nga 320px deri 1920px. */
function ViewportMeter() {
  const [width, setWidth] = React.useState<number | null>(null);

  React.useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (width === null) return null;

  const band =
    width < 480 ? "telefon" : width < 768 ? "telefon i madh" : width < 1024 ? "tablet" : "desktop";

  return (
    <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-text-muted sm:inline-flex">
      <span className="tabular text-text">{width}px</span>
      <span aria-hidden>·</span>
      <span>{band}</span>
    </span>
  );
}

function SectionNav() {
  const [active, setActive] = React.useState(NAV[0].id);

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
    <nav aria-label="Seksionet e sistemit të dizajnit" className="w-full">
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
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Showcase() {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-1 items-baseline gap-3">
            <span className="truncate font-serif text-xl text-text">Sistemi i dizajnit</span>
            <span className="hidden truncate text-xs text-text-muted md:inline">
              Studentët.KS · Faza 1
            </span>
          </div>
          <ViewportMeter />
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:gap-10 lg:py-12">
        <aside className="lg:sticky lg:top-24 lg:h-fit lg:w-52 lg:shrink-0">
          <SectionNav />
        </aside>

        <main id="permbajtja" className="flex min-w-0 flex-1 flex-col gap-12">
          <div className="flex flex-col gap-3">
            <h1 className="font-serif text-3xl text-text">
              Mësim që të lidh, lidhje që të mëson
            </h1>
            <p className="measure text-sm text-text-muted">
              Kjo faqe ekziston që çdo komponent të shihet bashkë, në të dyja temat, në çdo
              gjerësi. Nuk shkon në prodhim. Nëse diçka duket keq këtu, do të dukej keq edhe në
              feed.
            </p>
          </div>

          <SectionFoundations />
          <SectionControls />
          <SectionSurfaces />

          <footer className="border-t border-border pt-8 text-xs text-text-muted">
            Faza 1 e mbyllur: tokenat, tipografia, lëvizja dhe 21 komponentë bazë. Faza tjetër
            është skema e të dhënave dhe seed-i.
          </footer>
        </main>
      </div>
    </div>
  );
}
