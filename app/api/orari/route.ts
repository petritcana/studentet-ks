import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * Eksport ICS i orarit. Punon me Google Calendar, Apple Calendar dhe Outlook,
 * prandaj nuk na duhet integrim i veçantë me asnjërin.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Duhet të jesh i kyçur.", { status: 401 });

  const enrollments = await db.enrollment.findMany({
    where: { userId: user.id },
    select: {
      course: {
        select: {
          id: true,
          name: true,
          professor: true,
          slots: true,
          examDates: true,
        },
      },
    },
  });

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Studentet.KS//Orari//SQ",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Orari im — Studentët.KS",
    "X-WR-TIMEZONE:Europe/Belgrade",
  ];

  const stamp = formatIcs(new Date());
  const semesterEnd = new Date();
  semesterEnd.setMonth(semesterEnd.getMonth() + 4);

  for (const { course } of enrollments) {
    for (const slot of course.slots) {
      const start = nextWeekday(slot.dayOfWeek, slot.startTime);
      const end = nextWeekday(slot.dayOfWeek, slot.endTime);

      lines.push(
        "BEGIN:VEVENT",
        `UID:slot-${slot.id}@studentet.ks`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${formatIcs(start)}`,
        `DTEND:${formatIcs(end)}`,
        `RRULE:FREQ=WEEKLY;UNTIL=${formatIcs(semesterEnd)}`,
        `SUMMARY:${escapeIcs(course.name)} (${slot.kind === "lecture" ? "Ligjëratë" : "Ushtrime"})`,
        `LOCATION:${escapeIcs(slot.room)}`,
        `DESCRIPTION:${escapeIcs(course.professor)}`,
        "BEGIN:VALARM",
        "TRIGGER:-PT30M",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapeIcs(`Për 30 minuta ke ${course.name}`)}`,
        "END:VALARM",
        "END:VEVENT",
      );
    }

    for (const exam of course.examDates) {
      const end = new Date(exam.date.getTime() + 2 * 3600 * 1000);
      lines.push(
        "BEGIN:VEVENT",
        `UID:exam-${exam.id}@studentet.ks`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${formatIcs(exam.date)}`,
        `DTEND:${formatIcs(end)}`,
        `SUMMARY:${escapeIcs(`Provim: ${course.name}`)}`,
        `LOCATION:${escapeIcs(exam.room ?? "Salla shpallet më vonë")}`,
        `DESCRIPTION:${escapeIcs(exam.term)}`,
        "END:VEVENT",
      );
    }
  }

  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n"), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'attachment; filename="orari-studentet-ks.ics"',
      "cache-control": "no-store",
    },
  });
}

function formatIcs(date: Date) {
  return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

function escapeIcs(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Termini i parë i ardhshëm për këtë ditë të javës. */
function nextWeekday(dayOfWeek: number, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  const current = date.getDay() === 0 ? 7 : date.getDay();
  const delta = (dayOfWeek - current + 7) % 7;
  date.setDate(date.getDate() + delta);
  date.setHours(hours, minutes, 0, 0);
  return date;
}
