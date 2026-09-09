"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { askQuestion } from "@/lib/actions/academic";

export function QuestionForm({
  courses,
  defaultCourseId,
}: {
  courses: { id: string; name: string; code: string }[];
  defaultCourseId?: string;
}) {
  const router = useRouter();
  const [courseId, setCourseId] = React.useState(defaultCourseId ?? courses[0]?.id ?? "");
  const [title, setTitle] = React.useState("");
  const [text, setText] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function submit() {
    startTransition(async () => {
      const result = await askQuestion({ courseId, title, text });
      if (!result.ok) {
        toast.error(result.message ?? "S'u dërgua dot pyetja.");
        return;
      }
      toast.success("Pyetja u dërgua", {
        description: "Nëse s'merr përgjigje brenda gjashtë orësh, u dërgohet atyre që e kanë kaluar lëndën.",
      });
      router.push(`/pyetje/${result.questionId}`);
    });
  }

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <Field label="Lënda" htmlFor="question-course">
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger id="question-course">
            <SelectValue placeholder="Zgjidh lëndën" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.name} · {course.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        label="Pyetja"
        htmlFor="question-title"
        help="Shkruaje si do t'ia bëje një kolegu të vitit mbi ty."
      >
        <Input
          id="question-title"
          value={title}
          maxLength={160}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Si zgjidhet detyra 4 nga ushtrimet e kapitullit të tretë?"
        />
      </Field>

      <Field
        label="Sqarimi"
        htmlFor="question-text"
        help="Thuaj çfarë ke provuar dhe ku ngec. Kështu përgjigjja vjen më shpejt."
      >
        <Textarea
          id="question-text"
          autoGrow
          maxLength={4000}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="E kam provuar dy herë por më del rezultat tjetër nga ai i fletës. Nuk e di ku po gabohem, ndoshta te hapi i dytë."
        />
      </Field>

      <Button
        onClick={submit}
        loading={pending}
        size="lg"
        disabled={!courseId || title.trim().length < 10 || text.trim().length < 10}
      >
        <MessageCircleQuestion />
        Dërgo pyetjen
      </Button>
    </Card>
  );
}
