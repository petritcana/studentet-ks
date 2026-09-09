import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { EventForm } from "@/components/social/event-form";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Shpall një event",
  description: "Studio bashkë, workshop, garë ose aheng. Vendi, ora dhe RSVP.",
};

export default async function NewEventPage() {
  await requireUser();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Shpall një event"
        description="«Studio bashkë» merr dy minuta. Shkruaj ku, kur dhe çfarë po mbyllni, dhe të tjerët vijnë."
        back="/kampusi?tab=eventet"
      />
      <EventForm />
    </div>
  );
}
