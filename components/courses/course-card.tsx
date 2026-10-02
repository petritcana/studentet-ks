"use client";

import Link from "next/link";
import { MediaImage } from "@/components/ui/media-image";
import { useLocale, useTranslations } from "next-intl";
import { GraduationCap, PlayCircle, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export type CourseCardDto = {
  id: string;
  title: string;
  subtitle: string | null;
  coverImage: string | null;
  priceCents: number;
  currency: string;
  level: string;
  language: string;
  rating: number;
  ratingCount: number;
  lessonCount: number;
  instructorName: string;
  status?: string;
  enrolled?: boolean;
};

/**
 * Karta e kursit.
 *
 * Çmimi rri poshtë djathtas dhe kurrë nuk fshihet: një kurs me pagesë që duket
 * falas derisa klikon është mashtrim i vogël që e prish besimin.
 */
export function CourseCard({ course, href }: { course: CourseCardDto; href?: string }) {
  const locale = useLocale();
  const t = useTranslations("courses");

  return (
    <Card interactive className="flex flex-col overflow-hidden">
      <Link href={href ?? `/kurset/${course.id}`} className="flex flex-1 flex-col">
        <span className="relative block aspect-[16/9] w-full overflow-hidden bg-surface-2">
          {course.coverImage ? (
            <MediaImage
              src={course.coverImage}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 360px"
              className="object-cover"
            />
          ) : (
            <span className="grid size-full place-items-center text-text-muted">
              <GraduationCap className="size-8" />
            </span>
          )}
        </span>

        <span className="flex flex-1 flex-col gap-2 p-4">
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge variant="neutral">{t(`level_${course.level}`)}</Badge>
            <Badge variant="neutral">{course.language.toUpperCase()}</Badge>
            {course.status && course.status !== "published" ? (
              <Badge variant="warning">{t(`status_${course.status}`)}</Badge>
            ) : null}
          </span>

          <span className="line-clamp-2 text-sm font-semibold leading-snug text-text">
            {course.title}
          </span>

          {course.subtitle ? (
            <span className="line-clamp-2 text-xs text-text-muted">{course.subtitle}</span>
          ) : null}

          <span className="tabular mt-auto flex flex-wrap items-center gap-x-3 pt-2 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1">
              <PlayCircle className="size-3.5" />
              {t("lessons", { count: course.lessonCount })}
            </span>
            {course.ratingCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-warning-text">
                <Star className="size-3.5 fill-current" />
                {course.rating.toFixed(1)}
              </span>
            ) : null}
          </span>

          <span className="flex items-center gap-2 border-t border-border pt-3">
            <span className="truncate text-xs text-text-muted">{course.instructorName}</span>
            <span
              className={cn(
                "tabular ml-auto shrink-0 text-sm font-semibold",
                course.priceCents === 0 ? "text-success-text" : "text-text",
              )}
            >
              {course.enrolled
                ? t("continue")
                : course.priceCents === 0
                  ? t("free")
                  : formatMoney(course.priceCents, course.currency, locale)}
            </span>
          </span>
        </span>
      </Link>
    </Card>
  );
}
