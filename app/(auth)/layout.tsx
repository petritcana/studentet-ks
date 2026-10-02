import { getTranslations } from "next-intl/server";
import { BrandLogo } from "@/components/layout/brand";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("meta");

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <BrandLogo label={t("name")} ariaLabel={t("homeLink")} />
          <div className="flex items-center gap-1">
            <span className="max-[559px]:hidden">
              <LocaleSwitcher />
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id="permbajtja" className="flex flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
