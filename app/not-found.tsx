import Link from "next/link";
import { Compass } from "lucide-react";
import { BrandLogo } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
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
          <Compass className="size-6" />
        </span>
        <h1 className="font-serif text-2xl text-text">Kjo faqe nuk ekziston</h1>
        <p className="text-sm text-text-muted">
          Ndoshta linku është i vjetër, ose përmbajtja u fshi nga autori.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/feed">Kthehu te feed-i</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/materialet">Shiko materialet</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
