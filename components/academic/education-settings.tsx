"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { GraduationCap, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { AcademicPicker, EMPTY_SELECTION, type AcademicSelection } from "./academic-picker";
import { CityPicker } from "./city-picker";
import { removeAcademicProfile, savePreviousEducation, saveAcademicProfile } from "@/lib/actions/academic";

export type EducationState = {
  selection: AcademicSelection;
  year: number | null;
  cohortYear: number | null;
  institutionName: string | null;
  facultyName: string | null;
  programName: string | null;
  /** Shkurtesa e titullit: BSc, BA, LLB, MSc. Kjo shfaqet, jo fjala «bachelor». */
  degreeTitle: string | null;
  specializationName: string | null;
  campusName: string | null;
  level: string | null;
  previousInstitution: string;
  previousCity: string;
};

/**
 * Arsimimi te cilësimet.
 *
 * Studenti e ndryshon rrugën akademike kur ndërron programin, dhe e heq fare kur
 * mbaron studimet. Heqja nuk e fshin llogarinë: emri i përdoruesit, postimet dhe
 * bisedat mbeten aty ku ishin.
 */
export function EducationSettings({ initial }: { initial: EducationState }) {
  const router = useRouter();
  const t = useTranslations("academic");
  const tc = useTranslations("common");

  const [editing, setEditing] = React.useState(false);
  const [selection, setSelection] = React.useState<AcademicSelection>(initial.selection);
  const [year, setYear] = React.useState(initial.year ?? 1);
  const [cohortYear, setCohortYear] = React.useState(initial.cohortYear ?? new Date().getFullYear());
  const [previous, setPrevious] = React.useState({
    institution: initial.previousInstitution,
    city: initial.previousCity,
  });
  // Sa vite ka programi i zgjedhur: viti nuk duhet të dalë kurrë jashtë tij.
  const [years, setYears] = React.useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const hasEducation = Boolean(initial.programName);

  function save() {
    if (!selection.studyProgramId) {
      toast.error(t("chooseProgram"));
      return;
    }

    startTransition(async () => {
      const result = await saveAcademicProfile({
        studyProgramId: selection.studyProgramId!,
        specializationId: selection.specializationId,
        year,
        cohortYear,
      });
      if (!result.ok) {
        toast.error(tc("retry"));
        return;
      }
      toast.success(t("saved"));
      setEditing(false);
      router.refresh();
    });
  }

  function savePrevious() {
    startTransition(async () => {
      const result = await savePreviousEducation(previous);
      if (!result.ok) {
        toast.error(tc("retry"));
        return;
      }
      toast.success(t("saved"));
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeAcademicProfile();
      if (!result.ok) {
        toast.error(tc("retry"));
        return;
      }
      setConfirmRemove(false);
      setSelection(EMPTY_SELECTION);
      toast.success(t("removed"));
      router.refresh();
    });
  }

  const previousLabel = initial.level === "bachelor" ? t("highSchool") : t("previousDegree");

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
          <GraduationCap className="size-4 text-brand-500" />
          {t("education")}
        </h2>
        {!editing ? (
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            {hasEducation ? tc("edit") : t("addEducation")}
          </Button>
        ) : null}
      </div>

      {!editing ? (
        hasEducation ? (
          <dl className="flex flex-col gap-1 text-sm">
            <Row label={t("institution")} value={initial.institutionName} />
            <Row label={t("campus")} value={initial.campusName} />
            <Row label={t("faculty")} value={initial.facultyName} />
            <Row label={t("program")} value={initial.programName} />
            <Row label={t("specialization")} value={initial.specializationName} />
            <Row
              label={t("level")}
              value={
                initial.degreeTitle || initial.level
                  ? `${initial.degreeTitle ?? t(`level_${initial.level}`)}${
                      initial.year ? ` · ${t("yearValue", { year: initial.year })}` : ""
                    }`
                  : null
              }
            />
          </dl>
        ) : (
          <p className="text-sm text-text-muted">{t("noEducation")}</p>
        )
      ) : (
        <div className="flex flex-col gap-5">
          <AcademicPicker
            value={selection}
            onChange={setSelection}
            onProgramInfo={(info) => {
              setYears(info?.years ?? null);
              if (info && year > info.years) setYear(info.years);
            }}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edu-year">{t("year")}</Label>
              <Input
                id="edu-year"
                inputMode="numeric"
                value={String(year)}
                onChange={(event) =>
                  setYear(Math.max(1, Math.min(years ?? 8, Number(event.target.value) || 1)))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edu-cohort">{t("cohort")}</Label>
              <Input
                id="edu-cohort"
                inputMode="numeric"
                value={String(cohortYear)}
                onChange={(event) => setCohortYear(Number(event.target.value) || new Date().getFullYear())}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={save} loading={pending}>
              {tc("save")}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              {tc("cancel")}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-text">{t("previousEducation")}</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edu-previous">{previousLabel}</Label>
            <Input
              id="edu-previous"
              value={previous.institution}
              maxLength={120}
              onChange={(event) => setPrevious({ ...previous, institution: event.target.value })}
              placeholder={t("previousPlaceholder")}
            />
          </div>
          <CityPicker
            id="edu-previous-city"
            label={t("city")}
            value={previous.city}
            onChange={(city) => setPrevious({ ...previous, city })}
          />
        </div>

        <Button size="sm" variant="secondary" className="self-start" onClick={savePrevious} loading={pending}>
          {tc("save")}
        </Button>
      </div>

      {hasEducation ? (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <p className="text-xs text-text-muted">{t("removeEducationHelp")}</p>
          <Button
            size="sm"
            variant="ghost"
            className="self-start text-danger-text"
            onClick={() => setConfirmRemove(true)}
          >
            <Trash2 />
            {t("removeEducation")}
          </Button>
        </div>
      ) : null}

      <Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("removeEducation")}</DialogTitle>
            <DialogDescription>{t("removeEducationHelp")}</DialogDescription>
          </DialogHeader>
          <DialogBody className="text-sm text-text-muted">{t("removeEducationConfirm")}</DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmRemove(false)}>
              {tc("cancel")}
            </Button>
            <Button variant="danger" loading={pending} onClick={remove}>
              {t("removeEducation")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="text-sm text-text">{value}</dd>
    </div>
  );
}
