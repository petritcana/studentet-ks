"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileUp, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { uploadMaterial } from "@/lib/actions/materials";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { formatBytes } from "@/lib/format";
import { ACADEMIC_YEAR, MATERIAL_TYPES } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CONTRIBUTION_XP, PRO_DAYS } from "@/lib/xp";

/**
 * Ngarkimi.
 *
 * Nuk kyçet kurrë pas Pro-s: kush jep, merr. Prandaj shpërblimi prej shtatë
 * ditësh shkruhet mbi formë, jo poshtë saj.
 */
export function UploadForm({ courses }: { courses: { id: string; name: string }[] }) {
  const router = useRouter();
  const t = useTranslations("material");
  const tm = useTranslations("materialType");
  const tp = useTranslations("pro");
  const tc = useTranslations("common");
  const errors = useTranslations("errors");
  const guard = useTranslations("guard");

  const [file, setFile] = React.useState<File | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [type, setType] = React.useState<string>("notes");
  const [courseId, setCourseId] = React.useState(courses[0]?.id ?? "");
  const [rights, setRights] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);

  function messageFor(key: string | undefined) {
    if (!key) return tc("retry");
    if (key.startsWith("material.")) return t(key.replace("material.", ""));
    if (key.startsWith("errors.")) return errors(key.replace("errors.", ""));
    if (key.startsWith("guard.")) return guard(key.replace("guard.", ""));
    return tc("retry");
  }

  function pick(next: File | null) {
    if (next && next.size > MAX_UPLOAD_BYTES) {
      toast.error(t("errorSize"));
      return;
    }
    setFile(next);
  }

  function submit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!file) {
      toast.error(t("errorSize"));
      return;
    }

    const data = new FormData(formEvent.currentTarget);
    data.set("file", file);
    data.set("type", type);
    data.set("courseId", courseId);
    data.set("rightsConfirmed", String(rights));

    startTransition(async () => {
      const result = await uploadMaterial(data);
      if (!result.ok) {
        toast.error(messageFor(result.messageKey));
        return;
      }
      toast.success(t("uploaded", { xp: CONTRIBUTION_XP.materialApproved, days: PRO_DAYS.materialApproved }));
      router.push(result.id ? `/materialet/${result.id}` : "/materialet");
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-soft sm:p-6"
    >
      <div className="rounded-md border border-brand-500/25 bg-brand-500/6 p-3">
        <p className="text-sm font-medium text-text">{tp("earnBanner")}</p>
        <p className="mt-0.5 text-xs text-text-muted">{t("uploadBody", { xp: CONTRIBUTION_XP.materialApproved, days: PRO_DAYS.materialApproved })}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="material-file">{t("file")}</Label>
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            pick(event.dataTransfer.files[0] ?? null);
          }}
          className={cn(
            "flex flex-col items-center gap-2 rounded-md border border-dashed p-6 text-center",
            "transition-colors duration-150 ease-brand",
            dragging ? "border-brand-500 bg-brand-500/8" : "border-border bg-surface-2/50",
          )}
        >
          <FileUp className="size-6 text-text-muted" />
          <p className="text-sm text-text">{file ? file.name : t("fileDrop")}</p>
          <p className="tabular text-xs text-text-muted">
            {file ? formatBytes(file.size) : t("fileHelp")}
          </p>
          <input
            ref={inputRef}
            id="material-file"
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
            className="sr-only"
            onChange={(event) => pick(event.target.files?.[0] ?? null)}
          />
          <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
            {t("filePick")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="material-title">{t("titleField")}</Label>
        <Input id="material-title" name="title" required maxLength={160} />
        <p className="text-xs text-text-muted">{t("titleHelp")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="material-type">{t("type")}</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="material-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MATERIAL_TYPES.map((item) => (
                <SelectItem key={item} value={item}>
                  {tm(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="material-course">{t("myCourses")}</Label>
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger id="material-course">
              <SelectValue placeholder={t("errorCourse")} />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="material-year">{t("academicYear")}</Label>
          <Input id="material-year" name="academicYear" defaultValue={ACADEMIC_YEAR} maxLength={12} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="material-professor">{t("professor")}</Label>
          <Input id="material-professor" name="professor" maxLength={120} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="material-pages">{t("pages")}</Label>
          <Input id="material-pages" name="pages" type="number" min={1} max={5000} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="material-description">{t("descriptionField")}</Label>
        <Textarea id="material-description" name="description" autoGrow maxLength={1000} />
        <p className="text-xs text-text-muted">{t("descriptionHelp")}</p>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-2/60 p-3">
        <label htmlFor="material-rights" className="flex items-start gap-2.5 text-sm text-text">
          <Checkbox
            id="material-rights"
            checked={rights}
            onCheckedChange={(value) => setRights(value === true)}
            className="mt-0.5"
          />
          <span>
            {t("rights")}
            <span className="mt-0.5 block text-xs text-text-muted">{t("rightsBody")}</span>
          </span>
        </label>
        <p className="text-xs text-text-muted">{t("legalNote")}</p>
      </div>

      <Button type="submit" loading={pending} disabled={!file || !rights} className="self-start">
        <Upload />
        {t("upload")}
      </Button>
    </form>
  );
}
