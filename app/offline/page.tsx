import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { BrandLogo } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pa lidhje",
  description: "Nuk ka internet. Materialet e ruajtura mbeten të lexueshme.",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center px-4 py-3 sm:px-6">
          <BrandLogo />
        </div>
      </header>

      <main
        id="permbajtja"
        className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center"
      >
        <span className="grid size-14 place-items-center rounded-full bg-brand-500/12 text-brand-500">
          <WifiOff className="size-6" />
        </span>
        <h1 className="font-serif text-2xl text-text">S&apos;ka lidhje me internetin</h1>
        <p className="text-sm text-text-muted">
          Materialet që i ke hapur më parë mbeten të lexueshme. Sapo të kthehet lidhja, gjithçka
          rifreskohet vetë.
        </p>
        <Button asChild>
          <Link href="/une/ruajtjet">Hap ruajtjet e mia</Link>
        </Button>
      </main>
    </div>
  );
}
