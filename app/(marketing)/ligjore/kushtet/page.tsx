import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { LegalShell } from "@/components/layout/legal-shell";
import { TERMS } from "@/content/legal";

export async function generateMetadata(): Promise<Metadata> {
  const doc = TERMS[(await getLocale()) === "en" ? "en" : "sq"];
  return { title: doc.title, description: doc.description };
}

export default async function TermsPage() {
  const locale = await getLocale();
  return <LegalShell document={TERMS[locale === "en" ? "en" : "sq"]} />;
}
