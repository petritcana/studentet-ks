"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { createEvent } from "@/lib/actions/events";
import { EVENT_KINDS } from "@/lib/types";

export function EventForm() {
  const router = useRouter();
  const t = useTranslations("campus");
  const tk = useTranslations("eventKind");
  const tc = useTranslations("common");
  const guard = useTranslations("guard");

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [date, setDate] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [kind, setKind] = React.useState<string>("workshop");
  const [pending, startTransition] = React.useTransition();

  function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();

    startTransition(async () => {
      const result = await createEvent({
        title,
        description,
        date,
        location,
        kind,
      });
      if (!result.ok) {
        const key = result.messageKey ?? "";
        toast.error(
          key.startsWith("guard.")
            ? guard(key.replace("guard.", ""))
            : tc("retry"),
        );
        return;
      }
      toast.success(t("eventCreated"));
      router.push(result.eventId ? `/eventet/${result.eventId}` : "/eventet");
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-soft sm:p-6"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="event-title">{t("eventTitle")}</Label>
        <Input
          id="event-title"
          required
          maxLength={120}
          value={title}
          onChange={(item) => setTitle(item.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="event-description">{t("eventDescription")}</Label>
        <Textarea
          id="event-description"
          required
          autoGrow
          maxLength={2000}
          value={description}
          onChange={(item) => setDescription(item.target.value)}
          className="min-h-28"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-date">{t("eventDate")}</Label>
          <Input
            id="event-date"
            type="datetime-local"
            required
            value={date}
            onChange={(item) => setDate(item.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event-kind">{t("eventKind")}</Label>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger id="event-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_KINDS.map((item) => (
                <SelectItem key={item} value={item}>
                  {tk(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="event-location">{t("eventLocation")}</Label>
        <Input
          id="event-location"
          required
          maxLength={120}
          value={location}
          onChange={(item) => setLocation(item.target.value)}
        />
      </div>

      <Button type="submit" loading={pending} className="self-start">
        {t("eventCreate")}
      </Button>
    </form>
  );
}
