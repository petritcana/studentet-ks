"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { DAY_LABELS, DAY_LABELS_SHORT } from "@/lib/constants";
import { facultyTheme } from "@/lib/faculties";
import { cn } from "@/lib/utils";

export type ScheduleEntry = {
  id: string;
  courseId: string;
  courseName: string;
  facultyColor: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
  kind: string;
};

const DAYS = [1, 2, 3, 4, 5];

export function ScheduleGrid({ entries }: { entries: ScheduleEntry[] }) {
  const today = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const [view, setView] = React.useState<"week" | "day">("week");
  const [day, setDay] = React.useState(DAYS.includes(today) ? today : 1);

  if (entries.length === 0) {
    return (
      <EmptyState
        illustration="calendar"
        title="Orari yt është ende bosh"
        description="Sapo të zgjedhësh lëndët e semestrit, orari ndërtohet vetë nga terminët e tyre."
      />
    );
  }

  const byDay = (target: number) =>
    entries
      .filter((entry) => entry.dayOfWeek === target)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 self-start rounded-full border border-border bg-bg p-1">
        {(["week", "day"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setView(item)}
            aria-pressed={view === item}
            className={cn(
              "inline-flex h-8 items-center rounded-full px-4 text-sm font-medium transition-colors duration-150",
              view === item ? "bg-surface text-text shadow-soft" : "text-text-muted hover:text-text",
            )}
          >
            {item === "week" ? "Javore" : "Ditore"}
          </button>
        ))}
      </div>

      {view === "day" ? (
        <>
          <div className="flex gap-1 overflow-x-auto scrollbar-thin">
            {DAYS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDay(value)}
                aria-pressed={day === value}
                className={cn(
                  "flex shrink-0 flex-col items-center gap-0.5 rounded-md border px-4 py-2 transition-colors duration-150",
                  day === value
                    ? "border-brand-500 bg-brand-500/8 text-brand-500"
                    : "border-border bg-surface text-text-muted hover:text-text",
                )}
              >
                <span className="text-xs font-medium">{DAY_LABELS_SHORT[value]}</span>
                <span className="tabular text-xs">{byDay(value).length}</span>
              </button>
            ))}
          </div>
          <DayColumn day={day} entries={byDay(day)} isToday={day === today} />
        </>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {DAYS.map((value) => (
            <DayColumn key={value} day={value} entries={byDay(value)} isToday={value === today} />
          ))}
        </div>
      )}
    </div>
  );
}

function DayColumn({
  day,
  entries,
  isToday,
}: {
  day: number;
  entries: ScheduleEntry[];
  isToday: boolean;
}) {
  return (
    <Card className={cn("p-3", isToday && "border-brand-500/40")}>
      <div className="flex items-center justify-between gap-2">
        <p className={cn("text-sm font-semibold", isToday ? "text-brand-500" : "text-text")}>
          {DAY_LABELS[day]}
        </p>
        {isToday ? <Badge variant="brand">Sot</Badge> : null}
      </div>

      <div className="mt-2 flex flex-col gap-2">
        {entries.length === 0 ? (
          <p className="text-xs text-text-muted">Pa ligjërata.</p>
        ) : (
          entries.map((entry) => {
            const theme = facultyTheme(entry.facultyColor);
            return (
              <Link
                key={entry.id}
                href={`/lenda/${entry.courseId}`}
                className={cn(
                  "flex flex-col gap-1 rounded-md border-l-2 bg-surface-2 p-2.5",
                  "transition-colors duration-150 hover:bg-brand-500/8",
                )}
                style={{ borderLeftColor: `var(--faculty-${entry.facultyColor ?? "economics"})` }}
              >
                <span className="truncate text-sm font-medium text-text">
                  {entry.courseName}
                </span>
                <span className="tabular flex items-center gap-1 text-xs text-text-muted">
                  <Clock className="size-3" />
                  {entry.startTime}–{entry.endTime}
                </span>
                <span className="flex items-center gap-1 truncate text-xs text-text-muted">
                  <MapPin className="size-3 shrink-0" />
                  {entry.room}
                </span>
                <span className={cn("text-[10px] font-medium", theme.text)}>
                  {entry.kind === "lecture" ? "Ligjëratë" : "Ushtrime"}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </Card>
  );
}

/** Widget-i "Sot" për panelin kryesor. */
export function TodayWidget({ entries }: { entries: ScheduleEntry[] }) {
  const today = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const list = entries
    .filter((entry) => entry.dayOfWeek === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-4 text-brand-500" />
        <h2 className="text-sm font-semibold text-text">Sot</h2>
      </div>

      {list.length === 0 ? (
        <p className="mt-2 text-sm text-text-muted">
          Sot s&apos;ke ligjërata. Ditë e mirë për të mbyllur një kapitull.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {list.map((entry) => (
            <li key={entry.id} className="flex items-center gap-3 text-sm">
              <span className="tabular w-12 shrink-0 text-text-muted">{entry.startTime}</span>
              <Link
                href={`/lenda/${entry.courseId}`}
                className="min-w-0 flex-1 truncate text-text hover:text-brand-500"
              >
                {entry.courseName}
              </Link>
              <span className="shrink-0 text-xs text-text-muted">{entry.room}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
