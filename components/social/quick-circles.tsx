"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, MapPin, School, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { followCircle, type QuickCircle } from "@/lib/actions/social";

const CIRCLES: { key: QuickCircle; label: string; icon: typeof Users }[] = [
  { key: "generation", label: "Ndiq gjeneratën time", icon: GraduationCap },
  { key: "highSchool", label: "Ndiq nga shkolla ime e mesme", icon: School },
  { key: "city", label: "Ndiq nga qyteti im", icon: MapPin },
];

/** Mekanizmi (e): lidhu me një grup të tërë me një klikim. */
export function QuickCircles() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [done, setDone] = React.useState<QuickCircle[]>([]);

  function run(circle: QuickCircle) {
    startTransition(async () => {
      const result = await followCircle(circle);
      if (!result.ok) {
        toast.error(result.message ?? "S'u lidh dot ky rreth.");
        return;
      }
      setDone((current) => [...current, circle]);
      toast.success(result.message ?? "U lidhe me rrethin.");
      router.refresh();
    });
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <Users className="size-4 text-brand-500" />
        <h2 className="text-sm font-semibold text-text">Rrethe të shpejta</h2>
      </div>
      <p className="mt-1 text-xs text-text-muted">
        Një klikim të lidh me një grup të tërë njëherësh.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {CIRCLES.map((circle) => (
          <Button
            key={circle.key}
            variant="outline"
            size="sm"
            disabled={pending || done.includes(circle.key)}
            onClick={() => run(circle.key)}
          >
            <circle.icon />
            {done.includes(circle.key) ? "U lidh" : circle.label}
          </Button>
        ))}
      </div>
    </Card>
  );
}
