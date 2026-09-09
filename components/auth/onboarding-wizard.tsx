"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  FileText,
  MessageCircleQuestion,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { StepProgress } from "@/components/ui/progress";
import { SkeletonPerson } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { FacultyIcon } from "@/components/shared/faculty-icon";
import { MutualContext } from "@/components/social/mutual-context";
import {
  fetchSuggestions,
  finishOnboarding,
  saveCourses,
  saveFaculty,
  saveInterests,
  saveProfile,
  saveUniversity,
  saveYear,
  type OnboardingWin,
} from "@/lib/actions/onboarding";
import { followMany } from "@/lib/actions/social";
import { INTERESTS, KOSOVO_CITIES, STUDY_LEVELS, STUDY_LEVEL_LABELS } from "@/lib/constants";
import { facultyTheme } from "@/lib/faculties";
import type { SuggestedPerson } from "@/lib/suggestions";
import { cn } from "@/lib/utils";

export type WizardCourse = {
  id: string;
  name: string;
  code: string;
  year: number;
  semester: number;
  ects: number;
  professor: string;
};

export type WizardDepartment = { id: string; name: string; courses: WizardCourse[] };

export type WizardFaculty = {
  id: string;
  name: string;
  color: string;
  icon: string;
  departments: WizardDepartment[];
};

export type WizardUniversity = {
  id: string;
  name: string;
  abbr: string;
  city: string;
  faculties: WizardFaculty[];
};

export type WizardInitial = {
  step: number;
  name: string;
  bio: string;
  city: string;
  highSchool: string;
  universityId: string | null;
  facultyId: string | null;
  departmentId: string | null;
  year: number | null;
  level: string | null;
  interests: string[];
  courseIds: string[];
};

const TOTAL_STEPS = 9;

export function OnboardingWizard({
  universities,
  initial,
}: {
  universities: WizardUniversity[];
  initial: WizardInitial;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState(initial.step);
  const [pending, startTransition] = React.useTransition();

  const [universityId, setUniversityId] = React.useState(initial.universityId);
  const [facultyId, setFacultyId] = React.useState(initial.facultyId);
  const [departmentId, setDepartmentId] = React.useState(initial.departmentId);
  const [year, setYear] = React.useState<number | null>(initial.year);
  const [level, setLevel] = React.useState<string>(initial.level ?? "bachelor");
  const [courseIds, setCourseIds] = React.useState<string[]>(initial.courseIds);
  const [interests, setInterests] = React.useState<string[]>(initial.interests);
  const [profile, setProfile] = React.useState({
    name: initial.name,
    bio: initial.bio,
    city: initial.city,
    highSchool: initial.highSchool,
  });
  const [suggestions, setSuggestions] = React.useState<SuggestedPerson[] | null>(null);
  const [followed, setFollowed] = React.useState<string[]>([]);
  const [win, setWin] = React.useState<OnboardingWin | null>(null);

  const university = universities.find((item) => item.id === universityId) ?? null;
  const faculty = university?.faculties.find((item) => item.id === facultyId) ?? null;
  const department = faculty?.departments.find((item) => item.id === departmentId) ?? null;

  const suggestedCourses = React.useMemo(() => {
    if (!faculty) return [];
    const pool = department ? department.courses : faculty.departments.flatMap((d) => d.courses);
    return pool
      .filter((course) => (year ? course.year === year : true))
      .sort((a, b) => a.semester - b.semester || a.name.localeCompare(b.name, "sq"));
  }, [faculty, department, year]);

  // Lëndët parazgjidhen nga programi. Studenti vetëm konfirmon.
  React.useEffect(() => {
    if (step === 5 && courseIds.length === 0 && suggestedCourses.length > 0) {
      setCourseIds(suggestedCourses.map((course) => course.id));
    }
  }, [step, courseIds.length, suggestedCourses]);

  React.useEffect(() => {
    if (step !== 8 || suggestions !== null) return;
    startTransition(async () => {
      setSuggestions(await fetchSuggestions(12));
    });
  }, [step, suggestions]);

  function go(next: number) {
    setStep(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function run(work: () => Promise<{ ok: boolean; message?: string }>, next: number) {
    startTransition(async () => {
      const result = await work();
      if (!result.ok) {
        toast.error(result.message ?? "S'u ruajt dot. Provo prapë.");
        return;
      }
      go(next);
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <StepProgress current={step} total={TOTAL_STEPS} />

      {step === 2 ? (
        <StepUniversity
          universities={universities}
          selected={universityId}
          onSelect={setUniversityId}
          pending={pending}
          onNext={() =>
            universityId
              ? run(() => saveUniversity(universityId), 3)
              : toast.error("Zgjidh universitetin për të vazhduar.")
          }
        />
      ) : null}

      {step === 3 && university ? (
        <StepFaculty
          university={university}
          facultyId={facultyId}
          departmentId={departmentId}
          onSelectFaculty={(id) => {
            setFacultyId(id);
            setDepartmentId(null);
            setCourseIds([]);
          }}
          onSelectDepartment={setDepartmentId}
          pending={pending}
          onBack={() => go(2)}
          onNext={() =>
            facultyId
              ? run(() => saveFaculty(facultyId, departmentId), 4)
              : toast.error("Zgjidh fakultetin për të vazhduar.")
          }
        />
      ) : null}

      {step === 4 ? (
        <StepYear
          year={year}
          level={level}
          onYear={(value) => {
            setYear(value);
            setCourseIds([]);
          }}
          onLevel={setLevel}
          pending={pending}
          onBack={() => go(3)}
          onNext={() =>
            year
              ? run(() => saveYear(year, level), 5)
              : toast.error("Zgjidh vitin për të vazhduar.")
          }
        />
      ) : null}

      {step === 5 ? (
        <StepCourses
          courses={suggestedCourses}
          selected={courseIds}
          onToggle={(id) =>
            setCourseIds((current) =>
              current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id],
            )
          }
          onAll={() => setCourseIds(suggestedCourses.map((course) => course.id))}
          pending={pending}
          onBack={() => go(4)}
          onNext={() =>
            courseIds.length > 0
              ? run(() => saveCourses(courseIds), 6)
              : toast.error("Zgjidh të paktën një lëndë.")
          }
        />
      ) : null}

      {step === 6 ? (
        <StepInterests
          selected={interests}
          onToggle={(value) =>
            setInterests((current) =>
              current.includes(value)
                ? current.filter((item) => item !== value)
                : [...current, value],
            )
          }
          pending={pending}
          onBack={() => go(5)}
          onSkip={() => go(7)}
          onNext={() => run(() => saveInterests(interests), 7)}
        />
      ) : null}

      {step === 7 ? (
        <StepProfile
          profile={profile}
          onChange={setProfile}
          pending={pending}
          onBack={() => go(6)}
          onSkip={() => go(8)}
          onNext={() => run(() => saveProfile(profile), 8)}
        />
      ) : null}

      {step === 8 ? (
        <StepPeople
          suggestions={suggestions}
          followed={followed}
          onFollow={(id) =>
            setFollowed((current) =>
              current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
            )
          }
          onFollowAll={() => setSuggestions((current) => {
            if (current) setFollowed(current.map((person) => person.id));
            return current;
          })}
          pending={pending}
          onBack={() => go(7)}
          onNext={() => {
            if (followed.length < 5) {
              toast.error("Ndiq të paktën 5 veta. Kjo është ajo që e bën feed-in të gjallë.");
              return;
            }
            startTransition(async () => {
              await followMany(followed);
              const result = await finishOnboarding();
              if (!result.ok) {
                toast.error(result.message ?? "Diçka mungon ende.");
                return;
              }
              setWin(result.win ?? null);
              go(9);
              router.refresh();
            });
          }}
        />
      ) : null}

      {step === 9 ? <StepWin win={win} onEnter={() => router.replace("/materialet")} /> : null}
    </div>
  );
}

// --- hapat -----------------------------------------------------------------

function StepShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col gap-6 animate-rise">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-brand-500">
          {eyebrow}
        </span>
        <h1 className="font-serif text-2xl text-text">{title}</h1>
        {description ? <p className="measure text-sm text-text-muted">{description}</p> : null}
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">{footer}</div>
    </div>
  );
}

function StepUniversity({
  universities,
  selected,
  onSelect,
  onNext,
  pending,
}: {
  universities: WizardUniversity[];
  selected: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
  pending: boolean;
}) {
  const [query, setQuery] = React.useState("");
  const filtered = universities.filter((item) =>
    `${item.name} ${item.abbr} ${item.city}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <StepShell
      eyebrow="Hapi 2"
      title="Ku studion?"
      description="Shkruaj emrin ose shkurtesën. Kjo përcakton fakultetet që të shfaqen më pas."
      footer={
        <Button size="lg" onClick={onNext} loading={pending} className="ml-auto">
          Vazhdo
          <ArrowRight />
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <Input
          icon={<Search />}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Universiteti i Prishtinës, UBT, AAB..."
          aria-label="Kërko universitetin"
        />

        <div className="flex flex-col gap-2">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-pressed={selected === item.id}
              className={cn(
                "flex items-center gap-3 rounded-md border p-3 text-left",
                "transition-all duration-150 ease-brand",
                selected === item.id
                  ? "border-brand-500 bg-brand-500/8"
                  : "border-border bg-surface hover:border-brand-500/40",
              )}
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-md bg-brand-500/12 text-sm font-semibold text-brand-500">
                {item.abbr}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-text">{item.name}</span>
                <span className="truncate text-xs text-text-muted">
                  {item.city} · {item.faculties.length} fakultete
                </span>
              </span>
              {selected === item.id ? <Check className="size-5 shrink-0 text-brand-500" /> : null}
            </button>
          ))}

          {filtered.length === 0 ? (
            <p className="rounded-md border border-dashed border-border p-4 text-sm text-text-muted">
              S&apos;gjetëm asnjë universitet me këtë emër. Provo shkurtesën, p.sh. UP.
            </p>
          ) : null}
        </div>
      </div>
    </StepShell>
  );
}

function StepFaculty({
  university,
  facultyId,
  departmentId,
  onSelectFaculty,
  onSelectDepartment,
  onBack,
  onNext,
  pending,
}: {
  university: WizardUniversity;
  facultyId: string | null;
  departmentId: string | null;
  onSelectFaculty: (id: string) => void;
  onSelectDepartment: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
  pending: boolean;
}) {
  const faculty = university.faculties.find((item) => item.id === facultyId);

  return (
    <StepShell
      eyebrow="Hapi 3"
      title="Cili fakultet?"
      description="Ngjyra e fakultetit të ndjek kudo: në badge, në kanale dhe në renditje."
      footer={
        <>
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft />
            Prapa
          </Button>
          <Button size="lg" onClick={onNext} loading={pending} className="ml-auto">
            Vazhdo
            <ArrowRight />
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {university.faculties.map((item) => {
            const theme = facultyTheme(item.color);
            const active = facultyId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectFaculty(item.id)}
                aria-pressed={active}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-md border p-3 text-left",
                  "transition-all duration-150 ease-brand",
                  active
                    ? cn("border-current", theme.bg, theme.border)
                    : "border-border bg-surface hover:border-brand-500/40",
                )}
              >
                <span className={cn("grid size-9 place-items-center rounded-md", theme.bg, theme.text)}>
                  <FacultyIcon name={item.icon} className="size-4" />
                </span>
                <span className={cn("text-sm font-semibold", active ? theme.text : "text-text")}>
                  {theme.shortLabel}
                </span>
                <span className="line-clamp-2 text-xs text-text-muted">{item.name}</span>
              </button>
            );
          })}
        </div>

        {faculty && faculty.departments.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-text">Departamenti</p>
            <div className="flex flex-col gap-2">
              {faculty.departments.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectDepartment(item.id)}
                  aria-pressed={departmentId === item.id}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-md border p-3 text-left",
                    "transition-colors duration-150 ease-brand",
                    departmentId === item.id
                      ? "border-brand-500 bg-brand-500/8"
                      : "border-border bg-surface hover:border-brand-500/40",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-text">{item.name}</span>
                    <span className="block truncate text-xs text-text-muted">
                      {item.courses.length} lëndë
                    </span>
                  </span>
                  {departmentId === item.id ? (
                    <Check className="size-5 shrink-0 text-brand-500" />
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </StepShell>
  );
}

function StepYear({
  year,
  level,
  onYear,
  onLevel,
  onBack,
  onNext,
  pending,
}: {
  year: number | null;
  level: string;
  onYear: (value: number) => void;
  onLevel: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  pending: boolean;
}) {
  return (
    <StepShell
      eyebrow="Hapi 4"
      title="Në cilin vit je?"
      description="Nga kjo ndërtohet gjenerata jote dhe lista e lëndëve të semestrit."
      footer={
        <>
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft />
            Prapa
          </Button>
          <Button size="lg" onClick={onNext} loading={pending} className="ml-auto">
            Vazhdo
            <ArrowRight />
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-text">Niveli</p>
          <div className="grid grid-cols-3 gap-2">
            {STUDY_LEVELS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onLevel(item)}
                aria-pressed={level === item}
                className={cn(
                  "rounded-md border p-3 text-sm font-medium transition-colors duration-150 ease-brand",
                  level === item
                    ? "border-brand-500 bg-brand-500/8 text-brand-500"
                    : "border-border bg-surface text-text hover:border-brand-500/40",
                )}
              >
                {STUDY_LEVEL_LABELS[item]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-text">Viti</p>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onYear(value)}
                aria-pressed={year === value}
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
                  {["I", "II", "III", "IV"][value - 1]}
                </span>
                <span className="text-xs text-text-muted">viti</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </StepShell>
  );
}

function StepCourses({
  courses,
  selected,
  onToggle,
  onAll,
  onBack,
  onNext,
  pending,
}: {
  courses: WizardCourse[];
  selected: string[];
  onToggle: (id: string) => void;
  onAll: () => void;
  onBack: () => void;
  onNext: () => void;
  pending: boolean;
}) {
  return (
    <StepShell
      eyebrow="Hapi 5"
      title="Lëndët e këtij semestri"
      description="I parazgjodhëm nga programi yt. Hiq ato që s'i ke dhe vazhdo. Çdo lëndë të fut edhe në kanalin e saj."
      footer={
        <>
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft />
            Prapa
          </Button>
          <span className="tabular text-sm text-text-muted">
            {selected.length} të zgjedhura
          </span>
          <Button size="lg" onClick={onNext} loading={pending} className="ml-auto">
            Konfirmo lëndët
            <ArrowRight />
          </Button>
        </>
      }
    >
      {courses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <p className="text-sm text-text">S&apos;gjetëm lëndë për këtë vit në programin tënd.</p>
          <p className="mt-1 text-sm text-text-muted">
            Kthehu një hap prapa dhe zgjidh departamentin, ose vazhdo dhe shtoji më vonë.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onAll}
            className="self-start text-sm font-medium text-brand-500 hover:underline"
          >
            Zgjidhi të gjitha
          </button>
          <div className="flex flex-col gap-2">
            {courses.map((course) => {
              const active = selected.includes(course.id);
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => onToggle(course.id)}
                  aria-pressed={active}
                  className={cn(
                    "flex items-center gap-3 rounded-md border p-3 text-left",
                    "transition-colors duration-150 ease-brand",
                    active
                      ? "border-brand-500 bg-brand-500/8"
                      : "border-border bg-surface hover:border-brand-500/40",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-[6px] border",
                      active ? "border-brand-500 bg-brand-500 text-white" : "border-border",
                    )}
                  >
                    {active ? <Check className="size-3.5" strokeWidth={3} /> : null}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-text">{course.name}</span>
                    <span className="truncate text-xs text-text-muted">
                      {course.code} · semestri {course.semester} · {course.ects} ECTS ·{" "}
                      {course.professor}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </StepShell>
  );
}

function StepInterests({
  selected,
  onToggle,
  onBack,
  onSkip,
  onNext,
  pending,
}: {
  selected: string[];
  onToggle: (value: string) => void;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
  pending: boolean;
}) {
  return (
    <StepShell
      eyebrow="Hapi 6"
      title="Çfarë të pëlqen jashtë leksioneve?"
      description="Kjo ndikon vetëm te rekomandimet e njerëzve dhe eventeve, kurrë te materialet."
      footer={
        <>
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft />
            Prapa
          </Button>
          <Button variant="ghost" onClick={onSkip}>
            Kaloje
          </Button>
          <Button size="lg" onClick={onNext} loading={pending} className="ml-auto">
            Vazhdo
            <ArrowRight />
          </Button>
        </>
      }
    >
      <ChipGroup>
        {INTERESTS.map((interest) => (
          <Chip
            key={interest}
            selected={selected.includes(interest)}
            onClick={() => onToggle(interest)}
          >
            {interest}
          </Chip>
        ))}
      </ChipGroup>
    </StepShell>
  );
}

function StepProfile({
  profile,
  onChange,
  onBack,
  onSkip,
  onNext,
  pending,
}: {
  profile: { name: string; bio: string; city: string; highSchool: string };
  onChange: (value: { name: string; bio: string; city: string; highSchool: string }) => void;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
  pending: boolean;
}) {
  return (
    <StepShell
      eyebrow="Hapi 7"
      title="Si të njohin të tjerët?"
      description="Avatari gjenerohet nga inicialet e tua dhe mbetet i njëjti përgjithmonë."
      footer={
        <>
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft />
            Prapa
          </Button>
          <Button variant="ghost" onClick={onSkip}>
            Kaloje
          </Button>
          <Button size="lg" onClick={onNext} loading={pending} className="ml-auto">
            Vazhdo
            <ArrowRight />
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4">
          <Avatar name={profile.name || "Studenti"} size="xl" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text">
              {profile.name || "Emri yt"}
            </p>
            <p className="line-clamp-2 text-xs text-text-muted">
              {profile.bio || "Bio-ja jote shfaqet këtu."}
            </p>
          </div>
        </div>

        <Field label="Emri dhe mbiemri" htmlFor="ob-name">
          <Input
            id="ob-name"
            value={profile.name}
            onChange={(event) => onChange({ ...profile, name: event.target.value })}
          />
        </Field>

        <Field
          label="Bio"
          htmlFor="ob-bio"
          help={`${profile.bio.length} nga 160 shkronja`}
        >
          <Textarea
            id="ob-bio"
            autoGrow
            maxLength={160}
            value={profile.bio}
            onChange={(event) => onChange({ ...profile, bio: event.target.value })}
            placeholder="Ekonomiku, viti II. Ndihmoj me statistikë, kërkoj ndihmë me gjermanisht."
          />
        </Field>

        <Field label="Qyteti" htmlFor="ob-city" help="Ndihmon të gjesh njerëz që udhëtojnë si ti.">
          <Input
            id="ob-city"
            list="ob-cities"
            value={profile.city}
            onChange={(event) => onChange({ ...profile, city: event.target.value })}
            placeholder="Prishtinë"
          />
          <datalist id="ob-cities">
            {KOSOVO_CITIES.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
        </Field>

        <Field
          label="Shkolla e mesme"
          htmlFor="ob-school"
          hint="opsionale"
          help="Të lidh me ata që erdhën nga e njëjta shkollë."
        >
          <Input
            id="ob-school"
            value={profile.highSchool}
            onChange={(event) => onChange({ ...profile, highSchool: event.target.value })}
            placeholder="Gjimnazi 'Sami Frashëri', Prishtinë"
          />
        </Field>
      </div>
    </StepShell>
  );
}

function StepPeople({
  suggestions,
  followed,
  onFollow,
  onFollowAll,
  onBack,
  onNext,
  pending,
}: {
  suggestions: SuggestedPerson[] | null;
  followed: string[];
  onFollow: (id: string) => void;
  onFollowAll: () => void;
  onBack: () => void;
  onNext: () => void;
  pending: boolean;
}) {
  const enough = followed.length >= 5;

  return (
    <StepShell
      eyebrow="Hapi 8"
      title="Njerëz nga gjenerata jote"
      description="Të renditur sipas lëndëve të përbashkëta, vitit, shokëve të përbashkët dhe qytetit. Ndiq të paktën pesë."
      footer={
        <>
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft />
            Prapa
          </Button>
          <span className={cn("tabular text-sm", enough ? "text-success-text" : "text-text-muted")}>
            {followed.length} nga 5
          </span>
          <Button size="lg" onClick={onNext} loading={pending} className="ml-auto">
            Vazhdo
            <ArrowRight />
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Button
          variant="outline"
          onClick={onFollowAll}
          disabled={!suggestions || suggestions.length === 0}
          className="self-start"
        >
          <Users />
          Ndiq të gjithë
        </Button>

        {suggestions === null ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonPerson key={index} />
            ))}
          </div>
        ) : suggestions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-sm text-text">Ende s&apos;ka njerëz nga gjenerata jote këtu.</p>
            <p className="mt-1 text-sm text-text-muted">
              Je i pari. Ftoji shokët dhe merr badge-in Pionier i fakultetit.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {suggestions.map((person) => {
              const active = followed.includes(person.id);
              return (
                <div
                  key={person.id}
                  className="flex items-center gap-3 rounded-md border border-border bg-surface p-3"
                >
                  <Avatar name={person.name} src={person.avatar} verified={person.isVerified} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-text">{person.name}</span>
                    <MutualContext reasons={person.reasons} />
                  </div>
                  <Button
                    size="sm"
                    variant={active ? "secondary" : "primary"}
                    onClick={() => onFollow(person.id)}
                    aria-pressed={active}
                    className="min-w-24"
                  >
                    {active ? (
                      <>
                        <Check />
                        E ndjek
                      </>
                    ) : (
                      "Ndiqe"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </StepShell>
  );
}

function StepWin({ win, onEnter }: { win: OnboardingWin | null; onEnter: () => void }) {
  const items = [
    {
      icon: CalendarDays,
      title: win?.nextClass
        ? `Orari yt është gati`
        : "Orari yt është gati",
      body: win?.nextClass
        ? `${win.nextClass.course} ${win.nextClass.day} në ${win.nextClass.time}, ${win.nextClass.room}.`
        : `${win?.courseCount ?? 0} lëndë të shtuara në orar.`,
    },
    {
      icon: FileText,
      title: `${win?.materialCount ?? 0} materiale për lëndët e tua të presin`,
      body: "Skripta, shënime dhe provime të kaluara, të lidhura me lëndët që zgjodhe.",
    },
    {
      icon: MessageCircleQuestion,
      title: `${win?.openQuestionCount ?? 0} pyetje presin përgjigje`,
      body: "Nga gjenerata jote. Nëse e di përgjigjen, dikush po e pret sot.",
    },
    {
      icon: Users,
      title: `${win?.followingCount ?? 0} njerëz në rrethin tënd`,
      body: "Feed-i yt nis me ta. Sa më shumë ndjek, aq më i gjallë bëhet.",
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 animate-rise">
      <div className="flex flex-col gap-2">
        <Badge variant="brand" className="w-fit">
          <Sparkles />
          Gati
        </Badge>
        <h1 className="font-serif text-2xl text-text">Ja çfarë të pret tani</h1>
        <p className="measure text-sm text-text-muted">
          Nuk të themi urime. Të japim atë për çka erdhe.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-500/12 text-brand-500">
              <item.icon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text">{item.title}</p>
              <p className="text-sm text-text-muted">{item.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 border-t border-border pt-5">
        <Button size="lg" onClick={onEnter}>
          <BookOpen />
          Shpjere te materialet e mia
        </Button>
        <Button size="lg" variant="outline" asChild>
          <a href="/feed">
            <Building2 />
            Shiko feed-in
          </a>
        </Button>
      </div>
    </div>
  );
}
