"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchCampuses,
  fetchFaculties,
  fetchInstitutions,
  fetchPrograms,
  type AcademicInstitution,
  type AcademicOption,
  type AcademicProgram,
} from "@/lib/academic-client";
import { cn } from "@/lib/utils";

/**
 * Zgjedhja e rrugës akademike.
 *
 * Hierarkia nuk është e njëjtë për të gjithë, dhe kjo nuk fshihet:
 *
 *   universitet publik -> universiteti, fakulteti, programi
 *   kolegj privat     -> kolegji, programi
 *
 * Një kolegj privat nuk ka fakultete, prandaj hapi i fakultetit as nuk shfaqet.
 * Të sajonim një fakultet të rremë për UBT-në do të ishte gënjeshtër e vogël që
 * prish çdo kërkim, çdo feed fakulteti dhe çdo sugjerim njerëzish.
 *
 * Niveli nuk është hap më vete. «Mekatronikë, BSc» dhe «Mekatronikë, MSc» janë
 * dy zgjedhje të ndara te e njëjta listë, sepse ashtu i shkruan lista zyrtare
 * dhe ashtu e thotë studenti. Një hap i dytë për nivelin harrohej, dhe butoni
 * ankohej se s'ka program.
 */

export type AcademicSelection = {
  universityId: string | null;
  campusId: string | null;
  level: string | null;
  facultyId: string | null;
  studyProgramId: string | null;
  specializationId: string | null;
};

type Institution = AcademicInstitution;
type Option = AcademicOption;
type Program = AcademicProgram;

export const EMPTY_SELECTION: AcademicSelection = {
  universityId: null,
  campusId: null,
  level: null,
  facultyId: null,
  studyProgramId: null,
  specializationId: null,
};

export function AcademicPicker({
  value,
  onChange,
  onProgramInfo,
}: {
  value: AcademicSelection;
  onChange: (next: AcademicSelection) => void;
  /** Sa vite zgjat programi i zgjedhur, që hapi i vitit të dijë kufirin. */
  onProgramInfo?: (info: { years: number; level: string } | null) => void;
}) {
  const t = useTranslations("academic");

  const [institutions, setInstitutions] = React.useState<Institution[] | null>(null);
  const [campuses, setCampuses] = React.useState<Option[]>([]);
  const [faculties, setFaculties] = React.useState<Option[]>([]);
  // Derisa lista e fakulteteve të mbërrijë, te një universitet publik programet
  // rrinë të mbyllura: ndryshe rendi thyhet për një çast dhe studenti zgjedh
  // program para fakultetit.
  const [facultiesReady, setFacultiesReady] = React.useState(false);
  const [programs, setPrograms] = React.useState<Program[]>([]);
  const [loading, setLoading] = React.useState<string | null>(null);
  const [institutionQuery, setInstitutionQuery] = React.useState("");
  const [programQuery, setProgramQuery] = React.useState("");

  React.useEffect(() => {
    setLoading("institucionet");
    void fetchInstitutions()
      .then(setInstitutions)
      .catch(() => setInstitutions([]))
      .finally(() => setLoading(null));
  }, []);

  const institution = institutions?.find((item) => item.id === value.universityId) ?? null;
  const isPublic = institution?.type === "public";

  // Institucioni i ri fshin gjithçka nën të: një program i vjetër nuk i takon.
  React.useEffect(() => {
    if (!value.universityId) {
      setCampuses([]);
      setFaculties([]);
      setFacultiesReady(false);
      return;
    }

    setFacultiesReady(false);

    setLoading("kampuset");
    void Promise.all([
      fetchCampuses(value.universityId),
      fetchFaculties(value.universityId),
    ])
      .then(([campusItems, facultyItems]) => {
        setCampuses(campusItems);
        setFaculties(facultyItems);
      })
      .catch(() => {
        setCampuses([]);
        setFaculties([]);
      })
      .finally(() => {
        setFacultiesReady(true);
        setLoading(null);
      });
  }, [value.universityId]);

  // Te universitetet publike programet nuk kërkohen para se të dihet fakulteti.
  const needsFaculty = isPublic && (!facultiesReady || faculties.length > 0);
  const canSearchPrograms = Boolean(value.universityId) && (!needsFaculty || Boolean(value.facultyId));

  React.useEffect(() => {
    if (!canSearchPrograms) {
      setPrograms([]);
      return;
    }

    const timer = setTimeout(() => {
      setLoading("programet");
      void fetchPrograms({
        universityId: value.universityId!,
        campusId: value.campusId,
        facultyId: value.facultyId,
        query: programQuery,
      })
        .then(setPrograms)
        .catch(() => setPrograms([]))
        .finally(() => setLoading(null));
    }, 180);

    return () => clearTimeout(timer);
  }, [canSearchPrograms, value.universityId, value.campusId, value.facultyId, programQuery]);

  const chosen = programs.find((item) => item.id === value.studyProgramId) ?? null;

  // Njoftimi mbahet te një ref, që një funksion i ri në çdo render të mos e
  // rilëshojë efektin pa ndryshuar asgjë.
  const notify = React.useRef(onProgramInfo);
  notify.current = onProgramInfo;

  React.useEffect(() => {
    notify.current?.(chosen ? { years: chosen.years, level: chosen.level } : null);
  }, [chosen]);

  const shownInstitutions = (institutions ?? []).filter((item) =>
    institutionQuery
      ? `${item.name} ${item.nameEn ?? ""} ${item.abbr ?? ""} ${item.city ?? ""}`
          .toLowerCase()
          .includes(institutionQuery.toLowerCase())
      : true,
  );

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Institucioni */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="ap-institution">{t("institution")}</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" aria-hidden />
          <Input
            id="ap-institution"
            value={institutionQuery}
            onChange={(event) => setInstitutionQuery(event.target.value)}
            placeholder={t("institutionSearch")}
            className="pl-9"
          />
        </div>

        {institutions === null ? (
          <Loading label={t("loading")} />
        ) : shownInstitutions.length === 0 ? (
          <Empty title={t("institutionEmpty")} />
        ) : (
          <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto scrollbar-thin">
            {shownInstitutions.map((item) => (
              <li key={item.id}>
                <Choice
                  active={value.universityId === item.id}
                  title={item.name}
                  meta={`${item.abbr ?? ""}${item.city ? ` · ${item.city}` : ""}`}
                  onClick={() => {
                    setProgramQuery("");
                    onChange({ ...EMPTY_SELECTION, universityId: item.id });
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 2. Dega, vetëm kur institucioni ka më shumë se një. */}
      {institution && campuses.length > 1 ? (
        <Group label={t("campus")}>
          {campuses.map((campus) => (
            <Choice
              key={campus.id}
              compact
              active={value.campusId === campus.id}
              title={campus.name}
              onClick={() => {
                onChange({
                  ...value,
                  campusId: campus.id,
                  facultyId: null,
                  level: null,
                  studyProgramId: null,
                  specializationId: null,
                });
              }}
            />
          ))}
        </Group>
      ) : null}

      {/* 3. Fakulteti, vetëm te universitetet publike. */}
      {institution && needsFaculty ? (
        <Group label={t("faculty")}>
          {faculties.map((faculty) => (
            <Choice
              key={faculty.id}
              compact
              active={value.facultyId === faculty.id}
              title={faculty.name}
              onClick={() => {
                setProgramQuery("");
                onChange({
                  ...value,
                  facultyId: faculty.id,
                  level: null,
                  studyProgramId: null,
                  specializationId: null,
                });
              }}
            />
          ))}
        </Group>
      ) : null}

      {/* 4. Programi */}
      {institution ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="ap-program">{t("program")}</Label>

          {!canSearchPrograms ? (
            <Empty title={t("facultyFirst")} />
          ) : (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" aria-hidden />
                <Input
                  id="ap-program"
                  value={programQuery}
                  onChange={(event) => setProgramQuery(event.target.value)}
                  placeholder={t("programSearch")}
                  className="pl-9"
                />
              </div>

              {loading === "programet" ? (
                <Loading label={t("loading")} />
              ) : programs.length === 0 ? (
                <Empty title={t("programEmpty")} />
              ) : (
                <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto scrollbar-thin">
                  {programs.map((item) => (
                    <li key={item.id}>
                      <Choice
                        active={value.studyProgramId === item.id}
                        title={item.name}
                        meta={[item.degreeTitle ?? t(`level_${item.level}`), item.campusName]
                          .filter(Boolean)
                          .join(" · ")}
                        onClick={() =>
                          onChange({
                            ...value,
                            studyProgramId: item.id,
                            level: item.level,
                            specializationId: null,
                          })
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      ) : null}

      {/* 5. Drejtimi, vetëm kur programi i publikon. */}
      {chosen && chosen.specializations.length > 0 ? (
        <Group label={t("specialization")} help={t("specializationHelp")}>
          {chosen.specializations.map((item) => (
            <Choice
              key={item.id}
              compact
              active={value.specializationId === item.id}
              title={item.name}
              onClick={() => onChange({ ...value, specializationId: item.id })}
            />
          ))}
        </Group>
      ) : null}
    </div>
  );
}

function Group({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-text">{label}</legend>
      {help ? <p className="text-xs text-text-muted">{help}</p> : null}
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

function Choice({
  active,
  title,
  meta,
  compact,
  onClick,
}: {
  active: boolean;
  title: string;
  meta?: string;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-2 rounded-md border text-left transition-colors duration-150",
        compact ? "px-3 py-1.5 text-sm" : "w-full px-3 py-2",
        active
          ? "border-brand-500 bg-brand-500/10 text-text"
          : "border-border bg-surface text-text-muted hover:border-brand-500/40 hover:text-text",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-text">{title}</span>
        {meta ? <span className="truncate text-xs text-text-muted">{meta}</span> : null}
      </span>
      {active ? <Check className="size-4 shrink-0 text-brand-500" /> : null}
    </button>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-2 py-3 text-sm text-text-muted">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </p>
  );
}

function Empty({ title }: { title: string }) {
  return <p className="rounded-md border border-dashed border-border px-3 py-4 text-sm text-text-muted">{title}</p>;
}
