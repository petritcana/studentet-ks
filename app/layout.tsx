import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "@/components/shared/theme-provider";
import { ServiceWorkerRegistrar } from "@/components/shared/service-worker";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
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
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Studentët.KS — Mësim që të lidh, lidhje që të mëson",
    template: "%s · Studentët.KS",
  },
  description:
    "Gjithçka që të duhet për fakultetin, në një vend. Orari, materialet, pyetjet dhe njerëzit e gjeneratës sate.",
  applicationName: "Studentët.KS",
  keywords: ["studentë", "Kosovë", "materiale", "fakultet", "orar", "praktika"],
  authors: [{ name: "Studentët.KS" }],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Studentët.KS",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Studentët.KS",
    description: "Mësim që të lidh, lidhje që të mëson.",
    locale: "sq_AL",
    type: "website",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF9" },
    { media: "(prefers-color-scheme: dark)", color: "#0C0A09" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <a
              href="#permbajtja"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-sm focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-sm focus:text-brand-contrast"
            >
              {locale === "en" ? "Skip to content" : "Kalo te përmbajtja"}
            </a>
            {children}
            <Toaster />
            <ServiceWorkerRegistrar />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
