import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { LegalShell } from "@/components/layout/legal-shell";
import { PRIVACY } from "@/content/legal";

export async function generateMetadata(): Promise<Metadata> {
  const doc = PRIVACY[(await getLocale()) === "en" ? "en" : "sq"];
  return { title: doc.title, description: doc.description };
}

export default async function PrivacyPage() {
  const locale = await getLocale();
  return <LegalShell document={PRIVACY[locale === "en" ? "en" : "sq"]} />;
}
