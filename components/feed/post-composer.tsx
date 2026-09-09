"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Plus, Send, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { createPost } from "@/lib/actions/posts";
import { POST_TYPES, POST_TYPE_HINTS, POST_TYPE_LABELS, type PostType } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type ComposerCourse = { id: string; name: string; code: string };

const PLACEHOLDERS: Record<PostType, string> = {
  text: "Çfarë do të dinte gjenerata jote sot?",
  question: "Shkruaj pyetjen ashtu si do t'ia bëje një kolegu më të vjetër.",
  material: "Përshkruaj çfarë ngarkove dhe për çfarë shërben.",
  poll: "Cila është pyetja e sondazhit?",
  event: "Çfarë po organizon? Vendos vendin dhe orën në tekst.",
  seek: "Kërkoj bashkëstudent për... ose Ofroj ndihmë me...",
  campus_voice: "Shkruaj lirshëm. Pa emra, pa foto njerëzish.",
};

export function PostComposer({
  open,
  onOpenChange,
  user,
  courses,
  canUseCampusVoice,
  defaultType = "text",
  defaultCourseId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { name: string; avatar: string | null };
  courses: ComposerCourse[];
  canUseCampusVoice: boolean;
  defaultType?: PostType;
  defaultCourseId?: string;
}) {
  const router = useRouter();
  const [type, setType] = React.useState<PostType>(defaultType);
  const [text, setText] = React.useState("");
  const [courseId, setCourseId] = React.useState<string>(defaultCourseId ?? "");
  const [pollOptions, setPollOptions] = React.useState<string[]>(["", ""]);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (open) {
      setType(defaultType);
      setCourseId(defaultCourseId ?? "");
    }
  }, [open, defaultType, defaultCourseId]);

  const anonymous = type === "campus_voice";
  const needsCourse = type === "question" || type === "material";

  function reset() {
    setText("");
    setPollOptions(["", ""]);
  }

  function submit() {
    if (anonymous && !canUseCampusVoice) {
      toast.error(
        "Zëri i kampusit hapet pas shtatë ditësh dhe me email institucional të verifikuar.",
      );
      return;
    }
    if (needsCourse && !courseId) {
      toast.error("Zgjidh lëndën që pyetja të shkojë te njerëzit e duhur.");
      return;
    }

    startTransition(async () => {
      const result = await createPost({
        type,
        text,
        courseId: courseId || null,
        pollOptions: type === "poll" ? pollOptions.filter(Boolean) : undefined,
      });

      if (!result.ok) {
        toast.error(result.message ?? "S'u postua dot.");
        return;
      }

      toast.success(
        anonymous ? "E dërguam te Zëri i kampusit." : "E postove. +10 XP",
      );
      reset();
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] sm:mx-auto sm:max-w-2xl sm:rounded-t-xl">
        <SheetHeader>
          <SheetTitle>Çfarë po poston?</SheetTitle>
          <SheetDescription>{POST_TYPE_HINTS[type]}</SheetDescription>
        </SheetHeader>

        <SheetBody className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {POST_TYPES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setType(item)}
                aria-pressed={type === item}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-150 ease-brand",
                  type === item
                    ? "border-brand-500 bg-brand-500/12 text-brand-500"
                    : "border-border bg-surface text-text-muted hover:text-text",
                )}
              >
                {POST_TYPE_LABELS[item]}
              </button>
            ))}
          </div>

          <div className="flex items-start gap-3">
            {anonymous ? (
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-text-muted">
                <EyeOff className="size-4" />
              </span>
            ) : (
              <Avatar name={user.name} src={user.avatar} />
            )}
            <Textarea
              autoGrow
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={PLACEHOLDERS[type]}
              className="min-h-28 border-0 bg-transparent px-0 focus:ring-0"
              maxLength={4000}
              aria-label="Teksti i postimit"
            />
          </div>

          {anonymous ? (
            <div className="rounded-md border border-warning/30 bg-warning/8 p-3">
              <p className="text-sm text-text">
                Publikisht je anonim. Në backend llogaria mbetet e verifikuar.
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Emrat e studentëve dhe të stafit bllokohen automatikisht. Fotot e njerëzve nuk
                lejohen.
              </p>
            </div>
          ) : null}

          {type === "poll" ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-text">Opsionet</p>
              {pollOptions.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={option}
                    maxLength={80}
                    placeholder={`Opsioni ${index + 1}`}
                    onChange={(event) =>
                      setPollOptions((current) =>
                        current.map((item, i) => (i === index ? event.target.value : item)),
                      )
                    }
                    aria-label={`Opsioni ${index + 1}`}
                  />
                  {pollOptions.length > 2 ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Hiq opsionin ${index + 1}`}
                      onClick={() =>
                        setPollOptions((current) => current.filter((_, i) => i !== index))
                      }
                    >
                      <X />
                    </Button>
                  ) : null}
                </div>
              ))}
              {pollOptions.length < 4 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onClick={() => setPollOptions((current) => [...current, ""])}
                >
                  <Plus />
                  Shto opsion
                </Button>
              ) : null}
            </div>
          ) : null}

          {!anonymous ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="composer-course" className="text-sm font-medium text-text">
                Lënda {needsCourse ? "" : "(opsionale)"}
              </label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger id="composer-course">
                  <SelectValue placeholder="Pa lëndë" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name} · {course.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {needsCourse ? (
                <p className="text-xs text-text-muted">
                  Pyetja pa përgjigje pas 6 orësh u dërgohet studentëve që e kanë kaluar këtë
                  lëndë.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <Badge variant={anonymous ? "warning" : "brand"}>
              {POST_TYPE_LABELS[type]}
            </Badge>
            <span className="tabular text-xs text-text-muted">{text.length} / 4000</span>
            <Button
              onClick={submit}
              loading={pending}
              disabled={text.trim().length < 3}
              className="ml-auto"
            >
              <Send />
              Posto
            </Button>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
