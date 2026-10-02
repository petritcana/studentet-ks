import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { UserIdentityLine } from "@/components/identity/user-identity-line";
import { db } from "@/lib/db";
import { toPublicAuthor } from "@/lib/dto";
import { facultyStyle } from "@/lib/faculties";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("gamification");
  return { title: t("leaderboard") };
}

export const dynamic = "force-dynamic";

function startOfWeek(now = new Date()) {
  const date = new Date(now);
  const day = date.getDay() === 0 ? 7 : date.getDay();
  date.setDate(date.getDate() - (day - 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

export default async function LeaderboardPage() {
  const [me, locale, t] = await Promise.all([
    requireUser(),
    getLocale(),
    getTranslations("gamification"),
  ]);

  const english = locale === "en";
  const weekStart = startOfWeek();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // Renditja është vetëm brenda fakultetit tënd, kurrë globale.
  const weekly = await db.xpTransaction.groupBy({
    by: ["userId"],
    where: {
      createdAt: { gte: weekStart },
      revokedAt: null,
      amount: { gt: 0 },
      user: { facultyId: me.facultyId ?? undefined },
    },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 20,
  });

  const users = await db.user.findMany({
    where: { id: { in: weekly.map((row) => row.userId) } },
    select: {
      id: true,
      name: true,
      username: true,
      avatar: true,
      isVerified: true,
      year: true,
      proEarnedUntil: true,
      university: { select: { abbr: true } },
      faculty: { select: { name: true, nameEn: true, color: true } },
      subscriptions: { where: { status: "active" }, select: { status: true, expiresAt: true } },
    },
  });
  const userById = new Map(users.map((user) => [user.id, user]));

  // Gara mes fakulteteve: institucione kundër institucioneve, jo njerëz kundër njerëzve.
  const [faculties, materialsByFaculty, answersByFaculty] = await Promise.all([
    db.faculty.findMany({ select: { id: true, name: true, nameEn: true, color: true } }),
    db.material.groupBy({
      by: ["courseId"],
      where: { createdAt: { gte: monthStart }, verificationStatus: "verified" },
      _count: { id: true },
    }),
    db.answer.groupBy({
      by: ["questionId"],
      where: { createdAt: { gte: monthStart } },
      _count: { id: true },
    }),
  ]);

  const courseIds = [
    ...materialsByFaculty.map((row) => row.courseId),
  ];
  const questionIds = answersByFaculty.map((row) => row.questionId);

  const [courseFaculties, questionFaculties] = await Promise.all([
    courseIds.length
      ? db.course.findMany({
          where: { id: { in: courseIds } },
          select: { id: true, department: { select: { facultyId: true } } },
        })
      : Promise.resolve([]),
    questionIds.length
      ? db.question.findMany({
          where: { id: { in: questionIds } },
          select: { id: true, course: { select: { department: { select: { facultyId: true } } } } },
        })
      : Promise.resolve([]),
  ]);

  const facultyOfCourse = new Map(
    courseFaculties.map((course) => [course.id, course.department.facultyId]),
  );
  const facultyOfQuestion = new Map(
    questionFaculties.map((question) => [question.id, question.course.department.facultyId]),
  );

  const race = new Map<string, { materials: number; answers: number }>();
  for (const row of materialsByFaculty) {
    const facultyId = facultyOfCourse.get(row.courseId);
    if (!facultyId) continue;
    const current = race.get(facultyId) ?? { materials: 0, answers: 0 };
    current.materials += row._count.id;
    race.set(facultyId, current);
  }
  for (const row of answersByFaculty) {
    const facultyId = facultyOfQuestion.get(row.questionId);
    if (!facultyId) continue;
    const current = race.get(facultyId) ?? { materials: 0, answers: 0 };
    current.answers += row._count.id;
    race.set(facultyId, current);
  }

  const raceRows = faculties
    .map((faculty) => ({
      faculty,
      ...(race.get(faculty.id) ?? { materials: 0, answers: 0 }),
    }))
    .map((row) => ({ ...row, score: row.materials * 3 + row.answers }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const topScore = raceRows[0]?.score ?? 1;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-text">
          <Trophy className="size-5 text-brand-500" />
          {t("leaderboard")}
        </h1>
        <p className="measure text-sm text-text-muted">{t("leaderboardHelp")}</p>
      </header>

      {weekly.length === 0 ? (
        <EmptyState illustration="people" title={t("leaderboardEmpty")} />
      ) : (
        <ol className="flex flex-col gap-1">
          {weekly.map((row, index) => {
            const user = userById.get(row.userId);
            if (!user) return null;
            const isMe = row.userId === me.id;

            return (
              <li
                key={row.userId}
                className={cn(
                  "flex items-center gap-3 rounded-md border px-3 py-2",
                  isMe ? "border-brand-500 bg-brand-500/8" : "border-transparent",
                )}
              >
                <span className="tabular w-6 shrink-0 text-sm font-semibold text-text-muted">
                  {index + 1}
                </span>
                <UserIdentityLine
                  user={toPublicAuthor(user, locale)}
                  size="sm"
                  showYear={false}
                  className="min-w-0 flex-1"
                />
                {isMe ? <Badge variant="brand">{t("you")}</Badge> : null}
                <span className="tabular shrink-0 text-sm font-semibold text-text">
                  {row._sum.amount ?? 0}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-text">{t("facultyRace")}</h2>
        <p className="measure text-xs text-text-muted">{t("facultyRaceHelp")}</p>

        {raceRows.length === 0 ? (
          <p className="text-sm text-text-muted">{t("leaderboardEmpty")}</p>
        ) : (
          <Card className="flex flex-col gap-3 p-4">
            {raceRows.map((row) => (
              <div key={row.faculty.id} className="flex flex-col gap-1" style={facultyStyle(row.faculty.color)}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate text-text">
                    {english ? row.faculty.nameEn : row.faculty.name}
                  </span>
                  <span className="tabular shrink-0 text-xs text-text-muted">
                    {t("facultyRaceMeta", { materials: row.materials, answers: row.answers })}
                  </span>
                </div>
                <Progress value={Math.round((row.score / topScore) * 100)} />
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
