import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { ListingForm } from "@/components/market/listing-form";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("market");
  return { title: t("sell") };
}

export default async function NewListingPage() {
  const [me, t] = await Promise.all([requireUser(), getTranslations("market")]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Link href="/tregu" className="inline-flex w-fit items-center gap-1.5 text-sm text-text-muted hover:text-text">
        <ArrowLeft className="size-4" />
        {t("title")}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-text">{t("sell")}</h1>
      <ListingForm defaultCity={me.city ?? ""} />
    </div>
  );
}
