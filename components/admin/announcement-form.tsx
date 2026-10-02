"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaImage } from "@/components/ui/media-image";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { createAnnouncement, updateAnnouncement } from "@/lib/actions/announcements";
import { ANNOUNCEMENT_KINDS, type AnnouncementKind } from "@/lib/announcements";
import { uploadFile } from "@/lib/upload-client";
import { shrinkImage } from "@/lib/shrink-image";
import { cn } from "@/lib/utils";

const EMPTY = { title: "", titleEn: "", body: "", bodyEn: "", place: "", url: "", eventAt: "", endsAt: "" };

export type AnnouncementDraft = {
  id: string;
  kind: AnnouncementKind;
  title: string;
  titleEn: string;
  body: string;
  bodyEn: string;
  place: string | null;
  url: string | null;
  image: string | null;
  eventAt: string | null;
  endsAt: string | null;
  important: boolean;
};

/** Data për fushat e shfletuesit: `datetime-local` dhe `date` duan orën lokale, pa zonë. */
function localInput(value: string | null, withTime: boolean) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return withTime ? `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}` : day;
}

/**
 * Formulari i adminit për njoftimet, eventet, udhëtimet dhe takimet tona.
 *
 * I njëjti formular krijon dhe ndryshon: me `initial` hapet me vlerat e
 * njoftimit dhe ruan mbi të. Fotoja ngarkohet si çdo skedar tjetër dhe del te
 * dritarja e njoftimit.
 */
export function AnnouncementForm({ initial, onDone }: { initial?: AnnouncementDraft; onDone?: () => void }) {
  const router = useRouter();
  const t = useTranslations("adminAnnouncements");
  const ta = useTranslations("announcements");
  const tc = useTranslations("common");
  const errors = useTranslations("errors");

  const [kind, setKind] = React.useState<AnnouncementKind>(initial?.kind ?? "notice");
  const [fields, setFields] = React.useState(() =>
    initial
      ? {
          title: initial.title,
          titleEn: initial.titleEn,
          body: initial.body,
          bodyEn: initial.bodyEn,
          place: initial.place ?? "",
          url: initial.url ?? "",
          eventAt: localInput(initial.eventAt, true),
          endsAt: localInput(initial.endsAt, false),
        }
      : EMPTY,
  );
  const [image, setImage] = React.useState<string | null>(initial?.image ?? null);
  const [uploading, setUploading] = React.useState(false);
  const [important, setImportant] = React.useState(initial?.important ?? false);
  const [pending, startTransition] = React.useTransition();
  const fileRef = React.useRef<HTMLInputElement>(null);

  const withDate = kind !== "notice";

  function field(name: keyof typeof EMPTY) {
    return {
      id: `announcement-${name}${initial ? `-${initial.id}` : ""}`,
      value: fields[name],
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setFields((current) => ({ ...current, [name]: event.target.value })),
    };
  }

  async function pickImage(file: File) {
    setUploading(true);
    const ready = await shrinkImage(file).catch(() => file);
    const outcome = await uploadFile(ready, { surface: "post" });
    setUploading(false);
    if (!outcome.ok) {
      const key = outcome.errorKey.startsWith("errors.") ? outcome.errorKey.slice(7) : "generic";
      toast.error(errors(key));
      return;
    }
    setImage(`/api/media/${outcome.media.id}`);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const input = {
      kind,
      ...fields,
      image: image ?? "",
      // Data vjen nga fusha lokale e shfletuesit; serveri e ruan si çast të saktë.
      eventAt: withDate && fields.eventAt ? new Date(fields.eventAt).toISOString() : "",
      endsAt: fields.endsAt ? new Date(fields.endsAt).toISOString() : "",
      important,
    };
    startTransition(async () => {
      const result = initial ? await updateAnnouncement(initial.id, input) : await createAnnouncement(input);
      if (!result.ok) {
        toast.error(result.messageKey === "adminAnnouncements.invalid" ? t("invalid") : tc("retry"));
        return;
      }
      toast.success(initial ? t("updated") : t("published"));
      if (!initial) {
        setFields(EMPTY);
        setImage(null);
        setImportant(false);
      }
      onDone?.();
      router.refresh();
    });
  }

  const pill = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150",
      active ? "border-brand-500 bg-brand-500/10 text-text" : "border-border text-text-muted hover:text-text",
    );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" data-announcement-form={initial ? "edit" : "new"}>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-sm font-medium text-text">{t("kind")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {ANNOUNCEMENT_KINDS.map((value) => (
            <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)} className={pill(kind === value)}>
              {ta(`kind_${value}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={field("title").id}>{t("titleSq")}</Label>
          <Input {...field("title")} maxLength={120} placeholder={t("titlePlaceholder")} data-field="title" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={field("titleEn").id}>{t("titleEn")}</Label>
          <Input {...field("titleEn")} maxLength={120} data-field="titleEn" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={field("body").id}>{t("bodySq")}</Label>
          <Textarea {...field("body")} maxLength={400} placeholder={t("bodyPlaceholder")} data-field="body" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={field("bodyEn").id}>{t("bodyEn")}</Label>
          <Textarea {...field("bodyEn")} maxLength={400} data-field="bodyEn" />
        </div>

        {withDate ? (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field("eventAt").id}>{t("eventAt")}</Label>
              <Input {...field("eventAt")} type="datetime-local" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={field("place").id}>{t("place")}</Label>
              <Input {...field("place")} maxLength={80} placeholder={t("placePlaceholder")} />
            </div>
          </>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={field("url").id}>{t("url")}</Label>
          <Input {...field("url")} maxLength={300} placeholder={t("urlPlaceholder")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={field("endsAt").id}>{t("endsAt")}</Label>
          <Input {...field("endsAt")} type="date" />
          <p className="text-xs text-text-muted">{t("endsAtHint")}</p>
        </div>
      </div>

      {/* Fotoja: del te dritarja e njoftimit, sipër tekstit. */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text">{t("image")}</span>
        {image ? (
          <div className="relative w-full max-w-sm overflow-hidden rounded-card border border-border" data-announcement-image>
            <MediaImage src={image} alt="" width={640} height={320} className="aspect-[2/1] w-full object-cover" />
            <Button
              type="button"
              variant="secondary"
              size="iconSm"
              className="absolute right-2 top-2"
              aria-label={t("removeImage")}
              onClick={() => setImage(null)}
            >
              <X />
            </Button>
          </div>
        ) : (
          <Button type="button" variant="secondary" className="self-start" loading={uploading} onClick={() => fileRef.current?.click()} data-announcement-image-pick>
            <ImagePlus />
            {t("addImage")}
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void pickImage(file);
          }}
          data-announcement-image-input
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-text">
        <input type="checkbox" checked={important} onChange={(event) => setImportant(event.target.checked)} className="accent-brand-500" />
        {t("important")}
      </label>

      <Button type="submit" loading={pending} disabled={uploading} className="self-start" data-announcement-save>
        {initial ? t("save") : t("publish")}
      </Button>
    </form>
  );
}
