import type { Metadata, Viewport } from "next";
import { Instrument_Serif, JetBrains_Mono, Plus_Jakarta_Sans, Poppins } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Providers } from "@/components/shared/providers";
import { ServiceWorker } from "@/components/shared/service-worker";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

// Plus Jakarta Sans për tekstin, Poppins për titujt, markën dhe butonat kryesorë,
// JetBrains Mono për numrat dhe rreshtat meta. Të tria mbajnë shkronjat shqipe.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");

  return {
    title: { default: `${t("name")}, ${t("tagline")}`, template: `%s · ${t("name")}` },
    description: t("description"),
    applicationName: t("name"),
    openGraph: { title: t("name"), description: t("tagline"), type: "website" },
    formatDetection: { telephone: false },
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: t("name"), statusBarStyle: "default" },
    icons: { icon: "/icon-192.png", apple: "/apple-icon.png" },
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  };
}

export const viewport: Viewport = {
  // Tema nuk ndjek sistemin e pajisjes: shiriti i shfletuesit merr blunë e parazgjedhjes.
  themeColor: "#0f2451",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [locale, messages, t] = await Promise.all([
    getLocale(),
    getMessages(),
    getTranslations("meta"),
  ]);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${jakarta.variable} ${poppins.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <a
              href="#permbajtja"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-sm focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-sm focus:text-brand-contrast"
            >
              {t("skipToContent")}
            </a>
            {children}
            <Toaster />
            <ServiceWorker />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
