import "server-only";

import { db } from "@/lib/db";
import { jobFitsStudent } from "@/lib/job-match";

/** Sa njoftime pune merr një student në ditë. Më shumë se kaq bëhet zhurmë. */
export const JOB_ALERTS_PER_DAY = 3;

/** Sa studentë njoftohen për një shpallje. Kufi sigurie, jo synim. */
const MAX_RECIPIENTS = 2000;

function parseList(raw: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(raw ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Njoftimi për një shpallje të re.
 *
 * Shkruhet në masë, jo një nga një përmes `notify()`: për dy mijë studentë ajo do
 * të ishin gjashtë mijë pyetje, dhe me bazën në rajon tjetër publikimi do të
 * zgjaste minuta. Këtu janë katër pyetje, sado studentë të ketë. Preferenca e
 * kategorisë «Karriera» respektohet njësoj, dhe askush nuk merr më shumë se tri
 * njoftime pune në ditë.
 */
export async function notifyJobMatches(jobId: string): Promise<number> {
  const job = await db.jobPost.findUnique({
    where: { id: jobId },
    select: { id: true, title: true, field: true, company: { select: { name: true } } },
  });
  if (!job) return 0;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [students, muted, busy] = await db.$transaction([
    db.user.findMany({
      where: { role: "student" },
      take: MAX_RECIPIENTS * 4,
      select: {
        id: true,
        year: true,
        level: true,
        city: true,
        faculty: { select: { name: true } },
        studyProgram: { select: { name: true } },
        careerProfile: { select: { openToWork: true, desiredRoles: true } },
      },
    }),
    db.notificationSetting.findMany({
      where: { category: "career", inApp: false },
      select: { userId: true },
    }),
    db.notification.groupBy({
      by: ["userId"],
      where: { type: "job_new", createdAt: { gte: startOfDay } },
      _count: { _all: true },
      orderBy: { userId: "asc" },
    }),
  ]);

  const mutedIds = new Set(muted.map((row) => row.userId));
  const full = new Set(
    busy
      .filter((row) => ((row._count as { _all?: number })._all ?? 0) >= JOB_ALERTS_PER_DAY)
      .map((row) => row.userId),
  );

  const recipients = students
    .filter((student) => !mutedIds.has(student.id) && !full.has(student.id))
    .filter((student) =>
      jobFitsStudent(job, {
        viewer: {
          facultyName: student.faculty?.name ?? null,
          programName: student.studyProgram?.name ?? null,
          city: student.city,
          year: student.year,
          level: student.level,
        },
        openToWork: student.careerProfile?.openToWork ?? false,
        desiredRoles: parseList(student.careerProfile?.desiredRoles),
      }),
    )
    .slice(0, MAX_RECIPIENTS);

  if (recipients.length === 0) return 0;

  const payload = JSON.stringify({ title: job.title, company: job.company.name });
  await db.notification.createMany({
    data: recipients.map((student) => ({
      userId: student.id,
      category: "career",
      type: "job_new",
      targetId: job.id,
      targetType: "job",
      groupKey: `job_new:${job.id}`,
      payload,
    })),
  });

  return recipients.length;
}
