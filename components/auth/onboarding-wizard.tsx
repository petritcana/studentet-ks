"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Check, Loader2, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { StepProgress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { MediaPicker } from "@/components/feed/media-picker";
import { CityPicker } from "@/components/academic/city-picker";
import {
  fetchCampuses,
  fetchFaculties,
  fetchInstitutions,
  fetchPrograms,
  type AcademicInstitution,
  type AcademicOption,
  type AcademicProgram,
} from "@/lib/academic-client";
import { saveAcademicProfile } from "@/lib/actions/academic";
import { finishOnboarding, saveProfile } from "@/lib/actions/onboarding";
import { saveGender, saveProfileImages } from "@/lib/actions/settings";
import { defaultAvatarFor, isDefaultAvatar, isGender, type Gender } from "@/lib/default-avatar";
import { GenderPicker } from "@/components/profile/gender-picker";
import type { MediaRef } from "@/lib/media";
import { cn } from "@/lib/utils";

/**
 * Hyrja e studentit, hap pas hapi.
 *
 * Hierarkia akademike nuk është e njëjtë për të gjithë, dhe magjistari e ndjek
 * atë që ekziston vërtet:
 *
 *   universitet publik -> universiteti, fakulteti, programi
 *   kolegj privat      -> kolegji, programi
 *
 * Hapi i fakultetit as nuk shfaqet te një kolegj privat, sepse një fakultet i
 * sajuar do të ndotte çdo kërkim dhe çdo sugjerim njeriu më vonë.
 *
 * Njerëzit vijnë pas hapjes së llogarisë, jo para saj: studenti i sheh kur ka
 * tashmë një profil për t'u treguar.
 */

export type WizardInitial = {
  step: number;
  name: string;
  avatar: string | null;
  gender: string | null;
  bio: string;
  city: string;
  highSchool: string;
  universityId: string | null;
  /** Institucioni i emailit studentor: nuk ndërrohet, prandaj hapi 2 nuk shfaqet. */
  lockedUniversityId?: string | null;
  campusId: string | null;
  facultyId: string | null;
  studyProgramId: string | null;
  specializationId: string | null;
  year: number | null;
};

const TOTAL_STEPS = 5;
const YEAR_ROMAN = ["I", "II", "III", "IV", "V", "VI"];

export function OnboardingWizard({ initial }: { initial: WizardInitial }) {
  const router = useRouter();
  const t = useTranslations("onboarding");
  const tc = useTranslations("common");
  const ta = useTranslations("academic");

  const [step, setStep] = React.useState(initial.step);
  const [pending, startTransition] = React.useTransition();

  const [institutions, setInstitutions] = React.useState<AcademicInstitution[] | null>(null);
  const [campuses, setCampuses] = React.useState<AcademicOption[]>([]);
  const [faculties, setFaculties] = React.useState<AcademicOption[]>([]);
  // Derisa lista e fakulteteve të mbërrijë, te një universitet publik programet
  // rrinë të mbyllura: ndryshe rendi thyhet për një çast dhe studenti zgjedh
  // program para fakultetit.
  const [facultiesReady, setFacultiesReady] = React.useState(false);
  const [programs, setPrograms] = React.useState<AcademicProgram[] | null>(null);

  const [universityId, setUniversityId] = React.useState(initial.universityId);
  const [campusId, setCampusId] = React.useState(initial.campusId);
  const [facultyId, setFacultyId] = React.useState(initial.facultyId);
  const [programId, setProgramId] = React.useState(initial.studyProgramId);
  const [specializationId, setSpecializationId] = React.useState(initial.specializationId);
  const [year, setYear] = React.useState<number | null>(initial.year);

  const [institutionQuery, setInstitutionQuery] = React.useState("");
  const [programQuery, setProgramQuery] = React.useState("");

  const [photo, setPhoto] = React.useState<MediaRef[]>([]);
  const [gender, setGender] = React.useState<Gender | null>(isGender(initial.gender) ? initial.gender : null);
  const [profile, setProfile] = React.useState({
    bio: initial.bio,
    city: initial.city,
    highSchool: initial.highSchool,
  });

  React.useEffect(() => {
    void fetchInstitutions()
      .then(setInstitutions)
      .catch(() => setInstitutions([]));
  }, []);

  const institution = institutions?.find((item) => item.id === universityId) ?? null;
  const isPublic = institution?.type === "public";

  React.useEffect(() => {
    if (!universityId) {
      setCampuses([]);
      setFaculties([]);
      setFacultiesReady(false);
      return;
    }

    setFacultiesReady(false);

    void Promise.all([fetchCampuses(universityId), fetchFaculties(universityId)])
      .then(([campusItems, facultyItems]) => {
        setCampuses(campusItems);
        setFaculties(facultyItems);
      })
      .catch(() => {
        setCampuses([]);
        setFaculties([]);
      })
      .finally(() => setFacultiesReady(true));
  }, [universityId]);

  // Te universitetet publike programet nuk kërkohen para se të dihet fakulteti.
  const needsFaculty = isPublic && (!facultiesReady || faculties.length > 0);
  const canSearchPrograms = Boolean(universityId) && (!needsFaculty || Boolean(facultyId));

  React.useEffect(() => {
    if (!canSearchPrograms || !universityId) {
      setPrograms(null);
      return;
    }

    const timer = setTimeout(() => {
      void fetchPrograms({ universityId, campusId, facultyId, query: programQuery })
        .then(setPrograms)
        .catch(() => setPrograms([]));
    }, 180);

    return () => clearTimeout(timer);
  }, [canSearchPrograms, universityId, campusId, facultyId, programQuery]);

  const chosen = programs?.find((item) => item.id === programId) ?? null;
  const maxYear = chosen?.years ?? 4;

  function go(next: number) {
    setStep(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function chooseInstitution(id: string) {
    setUniversityId(id);
    setCampusId(null);
    setFacultyId(null);
    setProgramId(null);
    setSpecializationId(null);
    setProgramQuery("");
  }

  function chooseFaculty(id: string) {
    setFacultyId(id);
    setProgramId(null);
    setSpecializationId(null);
    setProgramQuery("");
  }

  /** Ruan programin, drejtimin dhe vitin. Pa to nuk ka rreth akademik. */
  function saveAcademic(next: number) {
    if (!programId) {
      toast.error(t("errorProgram"));
      return;
    }
    if (!year) {
      toast.error(t("errorYear"));
      return;
    }

    startTransition(async () => {
      const result = await saveAcademicProfile({
        studyProgramId: programId,
        specializationId,
        year,
        cohortYear: new Date().getFullYear(),
      });
      if (!result.ok) {
        toast.error(t("errorSave"));
        return;
      }
      go(next);
    });
  }

  /** «Hap llogarinë time»: ruan gjithçka, mbyll hyrjen, çon te njerëzit. */
  function openAccount(withProfile: boolean) {
    startTransition(async () => {
      if (withProfile) {
        const [saved, images, genderSaved] = await Promise.all([
          saveProfile(profile),
          photo[0] ? saveProfileImages({ avatarId: photo[0].id }) : Promise.resolve({ ok: true }),
          gender !== (isGender(initial.gender) ? initial.gender : null) ? saveGender(gender) : Promise.resolve({ ok: true }),
        ]);
        if (!saved.ok || !images.ok || !genderSaved.ok) {
          toast.error(t("errorSave"));
          return;
        }
      }

      const result = await finishOnboarding();
      if (!result.ok) {
        toast.error(t("errorSave"));
        return;
      }

      // Njerëzit vijnë te faqja e vet: hyrja mbaron këtu, dhe ai ekran mbijeton
      // edhe një rifreskim, gjë që një hap brenda magjistarit nuk do ta bënte.
      router.replace("/mireseerdhe");
    });
  }

  const shownInstitutions = (institutions ?? []).filter((item) =>
    institutionQuery
      ? `${item.name} ${item.nameEn} ${item.abbr} ${item.city}`
          .toLowerCase()
          .includes(institutionQuery.toLowerCase())
      : true,
  );

  const avatarPreview = photo[0]
    ? `/api/media/${photo[0].id}`
    : isDefaultAvatar(initial.avatar)
      ? defaultAvatarFor(gender)
      : initial.avatar;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <StepProgress current={step} total={TOTAL_STEPS} />

      {/* Hapi 2: institucioni */}
      {step === 2 ? (
        <Shell
          title={t("step2Title")}
          body={t("step2Body")}
          footer={
            <Button
              size="lg"
              className="ml-auto"
              onClick={() => (universityId ? go(3) : toast.error(t("errorUniversity")))}
            >
              {tc("continue")}
              <ArrowRight />
            </Button>
          }
        >
          <div className="flex flex-col gap-3">
            <Input
              icon={<Search />}
              value={institutionQuery}
              onChange={(event) => setInstitutionQuery(event.target.value)}
              placeholder={t("step2Search")}
              aria-label={t("step2Title")}
            />

            {institutions === null ? (
              <Waiting label={ta("loading")} />
            ) : shownInstitutions.length === 0 ? (
              <EmptyNote title={t("step2Empty")} />
            ) : (
              <div className="flex flex-col gap-2">
                {shownInstitutions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => chooseInstitution(item.id)}
                    aria-pressed={universityId === item.id}
                    data-institution={item.id}
                    className={cn(
                      "flex items-center gap-3 rounded-md border p-3 text-left transition-all duration-150 ease-brand",
                      universityId === item.id
                        ? "border-brand-500 bg-brand-500/8"
                        : "border-border bg-surface hover:border-brand-500/40",
                    )}
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-md bg-brand-500/12 text-xs font-semibold text-brand-500">
                      {item.abbr}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-text">{item.name}</span>
                      <span className="truncate text-xs text-text-muted">
                        {item.city} · {t(item.type === "public" ? "typePublic" : "typePrivate")}
                      </span>
                    </span>
                    {universityId === item.id ? (
                      <Check className="size-5 shrink-0 text-brand-500" />
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Shell>
      ) : null}

      {/* Hapi 3: fakulteti (vetëm publik) dhe programi */}
      {step === 3 && institution ? (
        <Shell
          title={needsFaculty ? t("step3TitlePublic") : t("step3TitlePrivate")}
          body={needsFaculty ? t("step3BodyPublic") : t("step3BodyPrivate")}
          footer={
            <>
              {initial.lockedUniversityId ? null : (
                <Button variant="ghost" onClick={() => go(2)}>
                  <ArrowLeft />
                  {tc("back")}
                </Button>
              )}
              <Button
                size="lg"
                className="ml-auto"
                onClick={() => (programId ? go(4) : toast.error(t("errorProgram")))}
              >
                {tc("continue")}
                <ArrowRight />
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-5">
            {campuses.length > 1 ? (
              <Row label={ta("campus")}>
                {campuses.map((campus) => (
                  <Chip
                    key={campus.id}
                    active={campusId === campus.id}
                    label={campus.name}
                    onClick={() => {
                      setCampusId(campus.id);
                      setProgramId(null);
                    }}
                  />
                ))}
              </Row>
            ) : null}

            {needsFaculty ? (
              <Row label={ta("faculty")}>
                {faculties.map((faculty) => (
                  <Chip
                    key={faculty.id}
                    active={facultyId === faculty.id}
                    label={faculty.name}
                    mark={{ "data-faculty": faculty.id }}
                    onClick={() => chooseFaculty(faculty.id)}
                  />
                ))}
              </Row>
            ) : null}

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-text">{ta("program")}</p>

              {!canSearchPrograms ? (
                <EmptyNote title={ta("facultyFirst")} mark="faculty-first" />
              ) : (
                <>
                  <Input
                    icon={<Search />}
                    value={programQuery}
                    onChange={(event) => setProgramQuery(event.target.value)}
                    placeholder={ta("programSearch")}
                    aria-label={ta("program")}
                  />

                  {programs === null ? (
                    <Waiting label={ta("loading")} />
                  ) : programs.length === 0 ? (
                    <EmptyNote title={ta("programEmpty")} />
                  ) : (
                    <div className="flex max-h-80 flex-col gap-2 overflow-y-auto scrollbar-thin">
                      {programs.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setProgramId(item.id);
                            setSpecializationId(null);
                            if (year && year > item.years) setYear(item.years);
                          }}
                          aria-pressed={programId === item.id}
                          data-program={item.id}
                          className={cn(
                            "flex items-center gap-3 rounded-md border p-3 text-left transition-colors duration-150 ease-brand",
                            programId === item.id
                              ? "border-brand-500 bg-brand-500/8"
                              : "border-border bg-surface hover:border-brand-500/40",
                          )}
                        >
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm font-medium text-text">{item.name}</span>
                            <span className="truncate text-xs text-text-muted">
                              {item.degreeTitle ?? ta(`level_${item.level}`)}
                            </span>
                          </span>
                          {programId === item.id ? (
                            <Check className="size-5 shrink-0 text-brand-500" />
                          ) : null}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </Shell>
      ) : null}

      {/* Hapi 4: niveli dhe viti */}
      {step === 4 && chosen ? (
        <Shell
          title={t("step4Title")}
          body={t("step4Body")}
          footer={
            <>
              <Button variant="ghost" onClick={() => go(3)}>
                <ArrowLeft />
                {tc("back")}
              </Button>
              <Button size="lg" className="ml-auto" loading={pending} onClick={() => saveAcademic(5)}>
                {tc("continue")}
                <ArrowRight />
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-6">
            {chosen.specializations.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-text">{ta("specialization")}</p>
                <p className="text-xs text-text-muted">{ta("specializationHelp")}</p>
                <div className="flex flex-wrap gap-2">
                  {chosen.specializations.map((item) => (
                    <Chip
                      key={item.id}
                      active={specializationId === item.id}
                      label={item.name}
                      onClick={() => setSpecializationId(item.id)}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-text">{t("step4Year")}</p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {Array.from({ length: maxYear }, (_, index) => index + 1).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setYear(value)}
                    aria-pressed={year === value}
                    data-year={value}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-md border p-4 transition-colors duration-150 ease-brand",
                      year === value
                        ? "border-brand-500 bg-brand-500/8"
                        : "border-border bg-surface hover:border-brand-500/40",
                    )}
                  >
                    <span
                      className={cn(
                        "tabular text-xl font-semibold",
                        year === value ? "text-brand-500" : "text-text",
                      )}
                    >
                      {YEAR_ROMAN[value - 1]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Shell>
      ) : null}

      {/* Hapi 5: profili */}
      {step === 5 ? (
        <Shell
          title={t("step5Title")}
          body={t("step5Body")}
          footer={
            <>
              <Button variant="ghost" onClick={() => go(4)}>
                <ArrowLeft />
                {tc("back")}
              </Button>
              <Button variant="ghost" disabled={pending} onClick={() => openAccount(false)}>
                {t("skip")}
              </Button>
              <Button size="lg" className="ml-auto" loading={pending} onClick={() => openAccount(true)}>
                {t("finishCta")}
                <ArrowRight />
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-5">
            {/*
              Rishikimi para se llogaria të hapet.

              Studenti i sheh bashkë zgjedhjet akademike, dhe secila kthehet te
              hapi i vet me një klikim. Pa këtë, gabimi zbulohej vetëm më vonë te
              cilësimet, kur profili tashmë kishte dalë para të tjerëve.
            */}
            <dl className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
              <ReviewRow
                label={ta("institution")}
                value={institution?.name ?? null}
                action={tc("edit")}
                onEdit={() => go(2)}
              />
              <ReviewRow
                label={ta("faculty")}
                value={faculties.find((item) => item.id === facultyId)?.name ?? null}
                action={tc("edit")}
                onEdit={() => go(3)}
              />
              <ReviewRow
                label={ta("program")}
                value={
                  chosen ? [chosen.name, chosen.degreeTitle].filter(Boolean).join(", ") : null
                }
                action={tc("edit")}
                onEdit={() => go(3)}
              />
              <ReviewRow
                label={ta("specialization")}
                value={chosen?.specializations.find((item) => item.id === specializationId)?.name ?? null}
                action={tc("edit")}
                onEdit={() => go(4)}
              />
              <ReviewRow
                label={ta("year")}
                value={year ? ta("yearValue", { year }) : null}
                action={tc("edit")}
                onEdit={() => go(4)}
              />
            </dl>

            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface p-4">
              <Avatar name={initial.name} src={avatarPreview} size="xl" />
              <div className="flex min-w-0 flex-col gap-2">
                <p className="truncate text-sm font-semibold text-text">{initial.name}</p>
                <MediaPicker media={photo} onChange={setPhoto} max={1} />
              </div>
            </div>

            <GenderPicker value={gender} onChange={setGender} />

            <Field label={t("step5Name")} htmlFor="ob-name" help={t("step5NameHelp")}>
              <Input id="ob-name" value={initial.name} readOnly disabled />
            </Field>

            <Field label={t("step5Bio")} htmlFor="ob-bio" hint={tc("optional")}>
              <Textarea
                id="ob-bio"
                autoGrow
                maxLength={160}
                value={profile.bio}
                placeholder={t("step5BioPlaceholder")}
                onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
              />
            </Field>

            <CityPicker
              id="ob-city"
              label={t("step5City")}
              help={t("step5CityHelp")}
              value={profile.city}
              onChange={(city) => setProfile({ ...profile, city })}
            />

            <Field
              label={t("step5School")}
              htmlFor="ob-school"
              hint={tc("optional")}
              help={t("step5SchoolHelp")}
            >
              <Input
                id="ob-school"
                value={profile.highSchool}
                maxLength={120}
                onChange={(event) => setProfile({ ...profile, highSchool: event.target.value })}
              />
            </Field>
          </div>
        </Shell>
      ) : null}

    </div>
  );
}

function Shell({
  title,
  body,
  children,
  footer,
}: {
  title: string;
  body?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 animate-rise flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-2xl text-text">{title}</h1>
        {body ? <p className="measure text-sm text-text-muted">{body}</p> : null}
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">{footer}</div>
    </div>
  );
}

/** Një rresht i rishikimit. Rreshti bosh nuk shfaqet: s'ka çfarë të rishikohet. */
function ReviewRow({
  label,
  value,
  action,
  onEdit,
}: {
  label: string;
  value: string | null;
  action: string;
  onEdit: () => void;
}) {
  if (!value) return null;

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <dt className="w-28 shrink-0 text-xs text-text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 truncate text-sm text-text">{value}</dd>
      <button
        type="button"
        onClick={onEdit}
        className="text-xs font-medium text-brand-500 hover:underline"
      >
        {action}
      </button>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-text">{label}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

function Chip({
  active,
  label,
  mark,
  onClick,
}: {
  active: boolean;
  label: string;
  /** Shenjë e qëndrueshme për testet, kur teksti ndryshon me gjuhën. */
  mark?: Record<string, string>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      {...mark}
      className={cn(
        "rounded-md border px-3 py-1.5 text-sm transition-colors duration-150 ease-brand",
        active
          ? "border-brand-500 bg-brand-500/10 text-text"
          : "border-border bg-surface text-text-muted hover:border-brand-500/40 hover:text-text",
      )}
    >
      {label}
    </button>
  );
}

function Waiting({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-2 py-3 text-sm text-text-muted">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </p>
  );
}

function EmptyNote({ title, mark }: { title: string; mark?: string }) {
  return (
    <p
      data-note={mark}
      className="rounded-md border border-dashed border-border p-4 text-sm text-text-muted"
    >
      {title}
    </p>
  );
}
