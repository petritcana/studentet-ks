"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileUp, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { uploadMaterial } from "@/lib/actions/academic";
import { MATERIAL_TYPES, MATERIAL_TYPE_LABELS } from "@/lib/constants";
import { cn, formatBytes } from "@/lib/utils";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/mp4",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function UploadForm({
  courses,
  defaultCourseId,
}: {
  courses: { id: string; name: string; code: string; professor: string }[];
  defaultCourseId?: string;
}) {
  const router = useRouter();
  const [courseId, setCourseId] = React.useState(defaultCourseId ?? courses[0]?.id ?? "");
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<string>("notes");
  const [academicYear, setAcademicYear] = React.useState("2025/26");
  const [professor, setProfessor] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [file, setFile] = React.useState<{ name: string; size: number } | null>(null);
  const [pages, setPages] = React.useState("");
  const [hasRights, setHasRights] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const course = courses.find((item) => item.id === courseId);

  React.useEffect(() => {
    if (course && !professor) setProfessor(course.professor);
  }, [course, professor]);

  function pickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    if (!picked) return;

    if (picked.size > MAX_BYTES) {
      toast.error("S'u ngarkua dot", { description: "Provo një skedar nën 25MB." });
      event.target.value = "";
      return;
    }
    if (picked.type && !ALLOWED.includes(picked.type)) {
      toast.error("Ky lloj skedari nuk pranohet", {
        description: "Lejohen PDF, foto, video MP4, prezantime dhe dokumente Word.",
      });
      event.target.value = "";
      return;
    }

    setFile({ name: picked.name, size: picked.size });
    if (!title) setTitle(picked.name.replace(/\.[a-z0-9]+$/i, ""));
  }

  function submit() {
    if (!file) {
      toast.error("Zgjidh një skedar para se ta dërgosh.");
      return;
    }
    startTransition(async () => {
      const result = await uploadMaterial({
        courseId,
        title,
        type,
        academicYear,
        professor,
        description,
        fileName: file.name,
        size: file.size,
        pages: pages ? Number(pages) : undefined,
        hasRights,
      });

      if (!result.ok) {
        toast.error(result.message ?? "S'u ngarkua dot.");
        return;
      }
      toast.success("E ngarkove", {
        description: "+50 XP. Hyn si i paverifikuar derisa ta vlerësojnë tre studentë.",
      });
      router.push(`/materialet/${result.materialId}`);
    });
  }

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <Field label="Lënda" htmlFor="upload-course">
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger id="upload-course">
            <SelectValue placeholder="Zgjidh lëndën" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name} · {item.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Skedari" htmlFor="upload-file" help="Deri 25MB. PDF, foto, prezantim ose video.">
        <label
          htmlFor="upload-file"
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed p-6 text-center",
            "transition-colors duration-150 ease-brand",
            file ? "border-brand-500 bg-brand-500/6" : "border-border hover:border-brand-500/50",
          )}
        >
          <FileUp className="size-6 text-brand-500" />
          {file ? (
            <>
              <span className="text-sm font-medium text-text">{file.name}</span>
              <span className="tabular text-xs text-text-muted">{formatBytes(file.size)}</span>
            </>
          ) : (
            <>
              <span className="text-sm font-medium text-text">Zgjidh skedarin</span>
              <span className="text-xs text-text-muted">ose zvarrite këtu</span>
            </>
          )}
          <input
            id="upload-file"
            type="file"
            className="sr-only"
            onChange={pickFile}
            accept=".pdf,.png,.jpg,.jpeg,.webp,.mp4,.pptx,.docx"
          />
        </label>
      </Field>

      <Field label="Titulli" htmlFor="upload-title" help="Shkruaj çfarë është dhe për cilin vit.">
        <Input
          id="upload-title"
          value={title}
          maxLength={160}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Skripta Mikroekonomi 2024, Prof. Berisha"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Lloji" htmlFor="upload-type">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="upload-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MATERIAL_TYPES.map((item) => (
                <SelectItem key={item} value={item}>
                  {MATERIAL_TYPE_LABELS[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Viti akademik" htmlFor="upload-year">
          <Input
            id="upload-year"
            value={academicYear}
            onChange={(event) => setAcademicYear(event.target.value)}
            placeholder="2025/26"
          />
        </Field>

        <Field label="Profesori" htmlFor="upload-professor">
          <Input
            id="upload-professor"
            value={professor}
            onChange={(event) => setProfessor(event.target.value)}
          />
        </Field>

        <Field label="Faqe" htmlFor="upload-pages" hint="opsionale">
          <Input
            id="upload-pages"
            type="number"
            min={1}
            max={2000}
            value={pages}
            onChange={(event) => setPages(event.target.value)}
          />
        </Field>
      </div>

      <Field
        label="Përshkrimi"
        htmlFor="upload-description"
        hint="opsional"
        help="Çfarë mbulon dhe çfarë duhet ditur para se të lexohet."
      >
        <Textarea
          id="upload-description"
          autoGrow
          maxLength={1000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="I skanova nga fletorja ime, janë të lexueshme. Përfshin edhe skemat për kapitujt e vështirë."
        />
      </Field>

      <label
        htmlFor="upload-rights"
        className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-surface-2 p-3"
      >
        <Checkbox
          id="upload-rights"
          checked={hasRights}
          onCheckedChange={(value) => setHasRights(value === true)}
          className="mt-0.5"
        />
        <span className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-sm text-text">
            <ShieldCheck className="size-4 text-success-text" />
            Ky material nuk shkel të drejta autoriale
          </span>
          <span className="text-xs text-text-muted">
            Librat e plotë nuk lejohen. Materialet e profesorëve vetëm me lejen e tyre ose si
            shënime të studentit.
          </span>
        </span>
      </label>

      <Button
        onClick={submit}
        loading={pending}
        size="lg"
        disabled={!file || !title.trim() || !courseId || !hasRights}
      >
        <Upload />
        Ngarko
      </Button>
    </Card>
  );
}
