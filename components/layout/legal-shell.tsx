import Link from "next/link";
import { BrandLogo } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export type LegalSection = { heading: string; body: string[]; list?: string[] };

export function LegalShell({
  title,
  updatedAt,
  intro,
  sections,
}: {
  title: string;
  updatedAt: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <BrandLogo />
          <ThemeToggle />
        </div>
      </header>

      <main id="permbajtja" className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-2xl text-text">{title}</h1>
          <p className="text-xs text-text-muted">Përditësuar më {updatedAt}</p>
          <p className="measure text-sm text-text-muted">{intro}</p>
        </div>

        <nav aria-label="Përmbajtja" className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Përmbajtja</p>
          <ol className="mt-2 flex flex-col gap-1">
            {sections.map((section, index) => (
              <li key={section.heading}>
                <a
                  href={`#seksioni-${index + 1}`}
                  className="text-sm text-brand-500 hover:underline"
                >
                  {index + 1}. {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {sections.map((section, index) => (
          <section
            key={section.heading}
            id={`seksioni-${index + 1}`}
            className="flex scroll-mt-20 flex-col gap-3"
          >
            <h2 className="font-serif text-xl text-text">
              {index + 1}. {section.heading}
            </h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="measure text-sm text-text">
                {paragraph}
              </p>
            ))}
            {section.list ? (
              <ul className="measure flex list-disc flex-col gap-1.5 pl-5 text-sm text-text-muted">
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        <footer className="border-t border-border pt-6 text-sm text-text-muted">
          Pyetje? Shkruaj te{" "}
          <span className="font-mono text-text">privatesia@studentet.ks</span>. Lexo edhe{" "}
          <Link href="/moderimi/publik" className="text-brand-500 hover:underline">
            raportin e moderimit
          </Link>
          .
        </footer>
      </main>
    </div>
  );
}
