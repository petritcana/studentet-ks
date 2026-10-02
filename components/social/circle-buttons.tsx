"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, GraduationCap, MapPin, School } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { followCircle, type QuickCircle } from "@/lib/actions/social";

const CIRCLES: { circle: QuickCircle; key: string; icon: typeof Building2 }[] = [
  { circle: "generation", key: "circleGeneration", icon: GraduationCap },
  { circle: "faculty", key: "circleFaculty", icon: Building2 },
  { circle: "highSchool", key: "circleHighSchool", icon: School },
  { circle: "city", key: "circleCity", icon: MapPin },
];

/**
 * Rrethet e shpejta.
 *
 * Një klikim lidh me një grup të tërë, sepse pesëdhjetë ndjekje një nga një nuk
 * i bën askush. Rrethet e zbrazëta thonë pse janë të zbrazëta, nuk zhduken.
 */
export function CircleButtons() {
  const router = useRouter();
  const t = useTranslations("social");
  const [done, setDone] = React.useState<QuickCircle[]>([]);
  const [pending, startTransition] = React.useTransition();

  function run(circle: QuickCircle) {
    startTransition(async () => {
      const result = await followCircle(circle);
      if (!result.ok) {
        toast.error(t("circleEmpty"));
        return;
      }
      setDone((current) => [...current, circle]);
      toast.success(t("followedMany", { count: result.values?.count ?? 0 }));
      router.refresh();
    });
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-text">{t("circles")}</p>
        <p className="measure text-xs text-text-muted">{t("circlesBody")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CIRCLES.map((item) => {
          const Icon = item.icon;
          const finished = done.includes(item.circle);

          return (
            <Button
              key={item.circle}
              size="sm"
              variant={finished ? "secondary" : "outline"}
              disabled={pending || finished}
              onClick={() => run(item.circle)}
            >
              <Icon />
              {finished ? t("circleDone") : t(item.key)}
            </Button>
          );
        })}
      </div>
    </Card>
  );
}
