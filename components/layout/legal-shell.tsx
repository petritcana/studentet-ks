import Link from "next/link";
import { SITE } from "@/lib/site";
import { getTranslations } from "next-intl/server";
import { BrandLogo } from "@/components/layout/brand";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import type { LegalDocument } from "@/content/legal";

export async function LegalShell({ document }: { document: LegalDocument }) {
  const [t, brand] = await Promise.all([getTranslations("legal"), getTranslations("meta")]);

  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <BrandLogo href="/" label={brand("name")} ariaLabel={brand("name")} />
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="permbajtja" className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-2xl text-text">{document.title}</h1>
          <p className="text-xs text-text-muted">{t("updated", { date: document.updatedAt })}</p>
          <p className="measure text-sm text-text-muted">{document.intro}</p>
        </div>

        <nav aria-label={t("contents")} className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{t("contents")}</p>
          <ol className="mt-2 flex flex-col gap-1">
            {document.sections.map((section, index) => (
              <li key={section.heading}>
                <a href={`#s-${index + 1}`} className="text-sm text-brand-500 hover:underline">
                  {index + 1}. {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {document.sections.map((section, index) => (
          <section key={section.heading} id={`s-${index + 1}`} className="flex scroll-mt-20 flex-col gap-3">
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

        <footer className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-6 text-sm text-text-muted">
          <span>
            {t("contact")}{" "}
            <a href={`mailto:${SITE.contactEmail}`} className="font-medium text-brand-500 hover:underline">
              {SITE.contactEmail}
            </a>
          </span>
          <Link href="/ligjore/kushtet" className="hover:text-text">
            {t("terms")}
          </Link>
          <Link href="/ligjore/privatesia" className="hover:text-text">
            {t("privacy")}
          </Link>
          <Link href="/moderimi/publik" className="hover:text-text">
            {t("moderation")}
          </Link>
        </footer>
      </main>
    </div>
  );
}
