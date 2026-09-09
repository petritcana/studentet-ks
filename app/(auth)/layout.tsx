import { BrandLogo } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <BrandLogo />
          <ThemeToggle />
        </div>
      </header>
      <main id="permbajtja" className="flex flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
