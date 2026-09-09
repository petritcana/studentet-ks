"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { createEvent } from "@/lib/actions/campus";
import { EVENT_KINDS, EVENT_KIND_LABELS } from "@/lib/constants";

const PRESETS: Record<string, { title: string; description: string; location: string }> = {
  study_together: {
    title: "Studio bashkë: ",
    description: "Po e mbyllim kapitullin e fundit para afatit. Sillni fletët e ushtrimeve.",
    location: "Biblioteka e fakultetit",
  },
  workshop: {
    title: "Workshop: ",
    description: "Një orë e gjysmë, praktike. Dilni me diçka të gatshme, jo me shënime.",
    location: "Salla ",
  },
};

export function EventForm() {
  const router = useRouter();
  const [kind, setKind] = React.useState<string>("study_together");
  const [title, setTitle] = React.useState(PRESETS.study_together.title);
  const [description, setDescription] = React.useState(PRESETS.study_together.description);
  const [location, setLocation] = React.useState(PRESETS.study_together.location);
  const [date, setDate] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function chooseKind(value: string) {
    setKind(value);
    const preset = PRESETS[value];
    if (preset) {
      setTitle(preset.title);
      setDescription(preset.description);
      setLocation(preset.location);
    }
  }

  function submit() {
    startTransition(async () => {
      const result = await createEvent({ title, description, location, date, kind });
      if (!result.ok) {
        toast.error(result.message ?? "S'u krijua dot eventi.");
        return;
      }
      toast.success("Eventi u shpall. E postuam edhe në feed.");
      router.push(`/eventet/${result.eventId}`);
    });
  }

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <Field label="Lloji" htmlFor="event-kind">
        <Select value={kind} onValueChange={chooseKind}>
          <SelectTrigger id="event-kind">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EVENT_KINDS.map((item) => (
              <SelectItem key={item} value={item}>
                {EVENT_KIND_LABELS[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Titulli" htmlFor="event-title">
        <Input
          id="event-title"
          value={title}
          maxLength={120}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Studio bashkë: Statistikë para afatit"
        />
      </Field>

      <Field
        label="Përshkrimi"
        htmlFor="event-description"
        help="Çfarë do të bëhet dhe çfarë duhet sjellë."
      >
        <Textarea
          id="event-description"
          autoGrow
          maxLength={2000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>

      <Field label="Vendi" htmlFor="event-location">
        <Input
          id="event-location"
          value={location}
          maxLength={160}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Biblioteka e Fakultetit Ekonomik, salla 2"
        />
      </Field>

      <Field label="Data dhe ora" htmlFor="event-date">
        <Input
          id="event-date"
          type="datetime-local"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </Field>

      <Button
        onClick={submit}
        loading={pending}
        size="lg"
        disabled={!title.trim() || !date || !location.trim()}
      >
        <CalendarPlus />
        Shpalle
      </Button>
    </Card>
  );
}
