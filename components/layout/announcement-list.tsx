"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Bus, CalendarDays, Clock, MapPin, Megaphone, Pencil, Users } from "lucide-react";
import { MediaImage } from "@/components/ui/media-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AnnouncementKind } from "@/lib/announcements";
import { cn } from "@/lib/utils";

/** Njoftimi, i gatshëm për pamje: datat vijnë të formatuara nga serveri, në orën e Kosovës. */
export type AnnouncementView = {
  id: string;
  kind: AnnouncementKind;
  /** Fakulteti kur njoftimi është i fakultetit, ndryshe emri i llojit. */
  label: string;
  important: boolean;
  title: string;
  body: string;
  /** Pllaka e datës: dita dhe muaji i shkurtër, nga eventi ose afati. */
  tile: { day: string; month: string } | null;
  when: string | null;
  place: string | null;
  deadline: string | null;
  url: string | null;
  /** Fotoja e njoftimit, kur admini ka vendosur një. */
  image: string | null;
  /** Për adminin: lidhja që e hap njoftimin te paneli për ta ndryshuar. */
  editHref: string | null;
};

const KIND_ICON: Record<AnnouncementKind, typeof Megaphone> = {
  notice: Megaphone,
  event: CalendarDays,
  trip: Bus,
  meetup: Users,
};

/** Si te referenca «Blu»: njoftimi në blu, eventi dhe takimi në blu të çelët, udhëtimi në vjollcë. */
const KIND_TONE: Record<AnnouncementKind, { text: string }> = {
  notice: { text: "text-brand-500" },
  event: { text: "text-event" },
  trip: { text: "text-trip" },
  meetup: { text: "text-event" },
};

/**
 * Lista e njoftimeve tona te shtylla.
 *
 * Çdo rresht mban vetëm llojin me ngjyrën e vet, «E rëndësishme» kur është, dhe
 * titullin. Teksti, afati, ora dhe vendi hapen me prekje, në dritare, që shtylla
 * të lexohet me një shikim.
 */
export function AnnouncementList({ items }: { items: AnnouncementView[] }) {
  const t = useTranslations("announcements");
  const [openId, setOpenId] = React.useState<string | null>(null);
  const open = items.find((item) => item.id === openId) ?? null;

  return (
    <>
      <ul className="flex flex-col">
        {items.map((item) => {
          const Icon = KIND_ICON[item.kind];
          const tone = KIND_TONE[item.kind];
          return (
            <li key={item.id} className="border-b border-border last:border-0">
              <button
                type="button"
                onClick={() => setOpenId(item.id)}
                data-announcement-item
                className="group -mx-2 flex w-[calc(100%+1rem)] flex-col gap-1 rounded-control px-2 py-3.5 text-left transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand-500"
              >
                <span className="flex flex-wrap items-center gap-2 text-[12.5px] font-bold">
                  <span className={cn("inline-flex items-center gap-1.5", tone.text)}>
                    <Icon className="size-[15px]" aria-hidden />
                    {item.label}
                  </span>
                  {item.important ? (
                    <span className="rounded-full border border-warning-line bg-warning-50 px-2.5 py-px text-xs text-warning-text">
                      {t("important")}
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 font-display text-[15.5px] font-bold leading-snug text-text">{item.title}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <Dialog open={open !== null} onOpenChange={(next) => (next ? null : setOpenId(null))}>
        <DialogContent className="sm:max-w-lg" data-announcement-detail>
          {open ? (
            <>
              <DialogHeader className="gap-3">
                <span className="flex flex-wrap items-center gap-2 text-xs font-bold">
                  <span className={cn("inline-flex items-center gap-1.5", KIND_TONE[open.kind].text)}>
                    {React.createElement(KIND_ICON[open.kind], { className: "size-4", "aria-hidden": true })}
                    {open.label}
                  </span>
                  {open.important ? (
                    <span className="rounded-full border border-warning-line bg-warning-50 px-2.5 py-0.5 text-warning-text">
                      {t("important")}
                    </span>
                  ) : null}
                </span>
                <DialogTitle className="text-2xl font-extrabold leading-tight">{open.title}</DialogTitle>
                <DialogDescription className="sr-only">{open.title}</DialogDescription>
              </DialogHeader>

              <DialogBody className="flex flex-col gap-4">
                {open.image ? (
                  <div data-announcement-photo>
                    <MediaImage src={open.image} alt="" width={960} height={480} className="aspect-[2/1] w-full rounded-card object-cover" />
                  </div>
                ) : null}
                {open.when || open.place || open.deadline ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {open.when ? (
                      <Fact icon={<Clock />} value={open.when} />
                    ) : null}
                    {open.place ? <Fact icon={<MapPin />} value={open.place} /> : null}
                    {open.deadline ? (
                      <Fact icon={<CalendarDays />} value={t("deadline", { date: open.deadline })} tone="warning" />
                    ) : null}
                  </div>
                ) : null}

                <p className="measure whitespace-pre-line text-[15px] leading-relaxed text-text">{open.body}</p>

                <div className="flex flex-wrap items-center gap-2">
                  {open.url ? (
                    <Button asChild>
                      <Link href={open.url}>
                        {t("open")}
                        <ArrowUpRight />
                      </Link>
                    </Button>
                  ) : null}
                  {open.editHref ? (
                    <Button asChild variant="secondary">
                      <Link href={open.editHref} data-announcement-edit-link>
                        <Pencil />
                        {t("edit")}
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </DialogBody>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Fact({ icon, value, tone }: { icon: React.ReactNode; value: string; tone?: "warning" }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-control border px-3 py-2.5 text-sm font-medium",
        tone === "warning" ? "border-warning-line bg-warning-50 text-warning-text" : "border-border bg-surface-2 text-text",
      )}
    >
      <span className="shrink-0 text-text-muted [&_svg]:size-4">{icon}</span>
      {value}
    </div>
  );
}
