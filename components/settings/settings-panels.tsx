"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, Save, Trash2, UserX } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip, ChipGroup } from "@/components/ui/chip";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SwitchRow } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { EmptyState } from "@/components/shared/empty-state";
import {
  deleteMyAccount,
  exportMyData,
  updateCourses,
  updateInterests,
  updatePreferences,
  updateProfile,
} from "@/lib/actions/settings";
import { unblockUser } from "@/lib/actions/social";
import { INTERESTS, KOSOVO_CITIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function ProfilePanel({
  initial,
}: {
  initial: {
    name: string;
    username: string;
    bio: string;
    city: string;
    highSchool: string;
    avatar: string | null;
  };
}) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, startTransition] = React.useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateProfile(form);
      setErrors(result.fieldErrors ?? {});
      if (!result.ok) {
        toast.error(result.message ?? "S'u ruajt dot.");
        return;
      }
      toast.success("E ruajtëm.");
      router.refresh();
    });
  }

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-text">Profili</h2>

      <div className="flex items-center gap-4">
        <Avatar name={form.name || "Studenti"} src={form.avatar} size="lg" />
        <p className="text-xs text-text-muted">
          Avatari gjenerohet nga inicialet e tua dhe mbetet i njëjti përgjithmonë.
        </p>
      </div>

      <Field label="Emri dhe mbiemri" htmlFor="set-name" error={errors.name}>
        <Input
          id="set-name"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
      </Field>

      <Field
        label="Emri i përdoruesit"
        htmlFor="set-username"
        error={errors.username}
        help="Kjo është adresa e profilit tënd."
      >
        <Input
          id="set-username"
          value={form.username}
          onChange={(event) =>
            setForm({ ...form, username: event.target.value.toLowerCase() })
          }
        />
      </Field>

      <Field label="Bio" htmlFor="set-bio" help={`${form.bio.length} nga 160 shkronja`}>
        <Textarea
          id="set-bio"
          autoGrow
          maxLength={160}
          value={form.bio}
          onChange={(event) => setForm({ ...form, bio: event.target.value })}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Qyteti" htmlFor="set-city">
          <Input
            id="set-city"
            list="set-cities"
            value={form.city}
            onChange={(event) => setForm({ ...form, city: event.target.value })}
          />
          <datalist id="set-cities">
            {KOSOVO_CITIES.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
        </Field>

        <Field label="Shkolla e mesme" htmlFor="set-school" hint="opsionale">
          <Input
            id="set-school"
            value={form.highSchool}
            onChange={(event) => setForm({ ...form, highSchool: event.target.value })}
          />
        </Field>
      </div>

      <Button onClick={save} loading={pending} className="self-start">
        <Save />
        Ruaj ndryshimet
      </Button>
    </Card>
  );
}

export function CoursesPanel({
  courses,
  selected,
}: {
  courses: { id: string; name: string; code: string; year: number; semester: number }[];
  selected: string[];
}) {
  const router = useRouter();
  const [chosen, setChosen] = React.useState(selected);
  const [pending, startTransition] = React.useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateCourses(chosen);
      if (!result.ok) {
        toast.error(result.message ?? "S'u ruajt dot.");
        return;
      }
      toast.success("Orari u rifreskua.");
      router.refresh();
    });
  }

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-semibold text-text">Lëndët e semestrit</h2>
        <p className="mt-1 text-xs text-text-muted">
          Çdo lëndë e zgjedhur të fut edhe në kanalin e saj dhe e ndërton orarin.
        </p>
      </div>

      {courses.length === 0 ? (
        <p className="text-sm text-text-muted">
          Nuk gjetëm lëndë për fakultetin dhe vitin tënd.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {courses.map((course) => {
            const active = chosen.includes(course.id);
            return (
              <button
                key={course.id}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setChosen((current) =>
                    current.includes(course.id)
                      ? current.filter((item) => item !== course.id)
                      : [...current, course.id],
                  )
                }
                className={cn(
                  "flex items-center gap-3 rounded-md border p-3 text-left transition-colors duration-150",
                  active
                    ? "border-brand-500 bg-brand-500/8"
                    : "border-border bg-surface hover:border-brand-500/40",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text">
                    {course.name}
                  </span>
                  <span className="block truncate text-xs text-text-muted">
                    {course.code} · viti {course.year} · semestri {course.semester}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <Button onClick={save} loading={pending} className="self-start">
        <Save />
        Ruaj lëndët
      </Button>
    </Card>
  );
}

export function InterestsPanel({ selected }: { selected: string[] }) {
  const router = useRouter();
  const [chosen, setChosen] = React.useState(selected);
  const [pending, startTransition] = React.useTransition();

  function save() {
    startTransition(async () => {
      await updateInterests(chosen);
      toast.success("E ruajtëm.");
      router.refresh();
    });
  }

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-semibold text-text">Interesat</h2>
        <p className="mt-1 text-xs text-text-muted">
          Ndikojnë vetëm te rekomandimet e njerëzve dhe eventeve.
        </p>
      </div>
      <ChipGroup>
        {INTERESTS.map((interest) => (
          <Chip
            key={interest}
            selected={chosen.includes(interest)}
            onClick={() =>
              setChosen((current) =>
                current.includes(interest)
                  ? current.filter((item) => item !== interest)
                  : [...current, interest],
              )
            }
          >
            {interest}
          </Chip>
        ))}
      </ChipGroup>
      <Button onClick={save} loading={pending} className="self-start">
        <Save />
        Ruaj interesat
      </Button>
    </Card>
  );
}

export function PreferencesPanel({
  initial,
}: {
  initial: { showReadReceipts: boolean; pushEnabled: boolean; analyticsConsent: boolean };
}) {
  const router = useRouter();
  const [state, setState] = React.useState(initial);
  const [, startTransition] = React.useTransition();

  function set(key: keyof typeof initial, value: boolean) {
    setState((current) => ({ ...current, [key]: value }));
    startTransition(async () => {
      await updatePreferences({ [key]: value });
      router.refresh();
    });
  }

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-semibold text-text">Njoftimet dhe privatësia</h2>
        <p className="mt-1 text-xs text-text-muted">
          Ndryshimi ruhet vetë. Maksimum dy njoftime push në ditë, kurrë pas orës 21:00.
        </p>
      </div>

      <SwitchRow
        id="pref-receipts"
        label="Trego kur i lexoj mesazhet"
        description="Nëse e fik, as ti nuk e sheh kur t'i lexojnë."
        checked={state.showReadReceipts}
        onCheckedChange={(value) => set("showReadReceipts", value)}
      />

      <SwitchRow
        id="pref-push"
        label="Njoftime në telefon"
        description="Vetëm për gjëra që kanë të bëjnë me ty: përgjigje, ftesa, afate."
        checked={state.pushEnabled}
        onCheckedChange={(value) => set("pushEnabled", value)}
      />

      <SwitchRow
        id="pref-analytics"
        label="Cookies analitike"
        description="Na ndihmojnë të kuptojmë çfarë përdoret. Të fikura si parazgjedhje."
        checked={state.analyticsConsent}
        onCheckedChange={(value) => set("analyticsConsent", value)}
      />
    </Card>
  );
}

export function BlockedPanel({
  blocked,
}: {
  blocked: { id: string; name: string; username: string; avatar: string | null; kind: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-semibold text-text">Të bllokuarit dhe të heshturit</h2>
        <p className="mt-1 text-xs text-text-muted">
          Personi i bllokuar nuk të sheh dhe nuk të shkruan. Ai nuk njoftohet për këtë.
        </p>
      </div>

      {blocked.length === 0 ? (
        <EmptyState
          illustration="people"
          compact
          title="Nuk ke bllokuar askënd"
          description="Bllokimi dhe heshtja janë gjithmonë të disponueshme te menyja e çdo profili."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {blocked.map((person) => (
            <li key={person.id} className="flex items-center gap-3">
              <Avatar name={person.name} src={person.avatar} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-text">{person.name}</span>
                <span className="block truncate text-xs text-text-muted">
                  {person.kind === "block" ? "I bllokuar" : "I heshtur"}
                </span>
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await unblockUser(person.id);
                    toast.success("E hoqe bllokimin.");
                    router.refresh();
                  })
                }
              >
                <UserX />
                Hiqe
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function DataPanel() {
  const [pending, startTransition] = React.useTransition();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState("");

  function exportData() {
    startTransition(async () => {
      const result = await exportMyData();
      if (!result.ok || !result.payload) {
        toast.error(result.message ?? "S'u përgatit dot eksporti.");
        return;
      }
      const blob = new Blob([result.payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "te-dhenat-e-mia-studentet-ks.json";
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Eksporti u shkarkua.");
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteMyAccount(confirmation);
      if (!result?.ok) {
        toast.error(result?.message ?? "S'u fshi dot llogaria.");
      }
    });
  }

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-semibold text-text">Të dhënat e tua</h2>
        <p className="mt-1 text-xs text-text-muted">
          Të drejtat sipas Ligjit Nr. 06/L-082 i ushtron këtu, pa na shkruar.
        </p>
      </div>

      <Button variant="secondary" onClick={exportData} loading={pending} className="self-start">
        <Download />
        Shkarko të dhënat e mia
      </Button>

      <div className="rounded-md border border-danger/30 bg-danger/6 p-3">
        <p className="text-sm font-medium text-text">Fshije llogarinë</p>
        <p className="mt-1 text-xs text-text-muted">
          Fshihet menjëherë, bashkë me postimet, materialet dhe mesazhet e tua. Nuk kthehet.
        </p>
        <Button
          variant="danger"
          size="sm"
          className="mt-3"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 />
          Fshije llogarinë
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fshije llogarinë</DialogTitle>
            <DialogDescription>
              Kjo fshin profilin, postimet, materialet, pyetjet dhe mesazhet e tua. Nuk ka kthim.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field
              label="Shkruaj «fshije» për ta konfirmuar"
              htmlFor="delete-confirm"
            >
              <Input
                id="delete-confirm"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="fshije"
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Anulo
            </Button>
            <Button
              variant="danger"
              onClick={remove}
              loading={pending}
              disabled={confirmation.trim().toLowerCase() !== "fshije"}
            >
              Fshije përfundimisht
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
