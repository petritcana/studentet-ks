import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EventForm } from "@/components/campus/event-form";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("campus");
  return { title: t("createEvent") };
}

export const dynamic = "force-dynamic";

export default async function CreateEventPage() {
  const [, t] = await Promise.all([requireUser(), getTranslations("campus")]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text">{t("createEvent")}</h1>
        <p className="measure text-sm text-text-muted">{t("eventDescription")}</p>
      </header>

      <EventForm />
    </div>
  );
}
