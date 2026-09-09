"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { setRsvp } from "@/lib/actions/campus";

const OPTIONS = [
  { value: "going", label: "Po vij", icon: Check },
  { value: "maybe", label: "Ndoshta", icon: HelpCircle },
  { value: "not_going", label: "S'vij", icon: X },
] as const;

export function RsvpButtons({
  eventId,
  current,
}: {
  eventId: string;
  current: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = React.useState(current);
  const [pending, startTransition] = React.useTransition();

  function choose(value: (typeof OPTIONS)[number]["value"]) {
    const previous = status;
    setStatus(value);

    startTransition(async () => {
      const result = await setRsvp(eventId, value);
      if (!result.ok) {
        setStatus(previous);
        toast.error(result.message ?? "S'u ruajt dot.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((option) => (
        <Button
          key={option.value}
          variant={status === option.value ? "primary" : "secondary"}
          size="pill"
          onClick={() => choose(option.value)}
          disabled={pending}
          aria-pressed={status === option.value}
        >
          <option.icon />
          {option.label}
        </Button>
      ))}
    </div>
  );
}
