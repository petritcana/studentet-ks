import { db } from "@/lib/db";
import { XP_VALUES } from "@/lib/xp";

/**
 * Renditjet janë javore, resetohen vetë dhe jetojnë vetëm brenda grupeve të
 * vogla: gjenerata, lënda, fakulteti. Kurrë renditje globale. Shfaqet vetëm
 * top 10 dhe pozicioni yt, kurrë fundi i listës.
 */
export type LeaderboardScope = "generation" | "faculty" | "course";

export type LeaderboardRow = {
  rank: number;
  userId: string;
  name: string;
  username: string;
  avatar: string | null;
  isVerified: boolean;
  points: number;
  isMe: boolean;
};

export type LeaderboardResult = {
  label: string;
  rows: LeaderboardRow[];
  me: LeaderboardRow | null;
  totalParticipants: number;
};

function weekStart() {
  const date = new Date();
  const day = date.getDay() === 0 ? 7 : date.getDay();
  date.setDate(date.getDate() - (day - 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function getLeaderboard(
  userId: string,
  scope: LeaderboardScope,
  courseId?: string,
): Promise<LeaderboardResult | null> {
  const me = await db.user.findUnique({
    where: { id: userId },
    select: { facultyId: true, year: true, faculty: { select: { name: true } } },
  });
  if (!me) return null;

  const since = weekStart();

  const participants = await db.user.findMany({
    where:
      scope === "course" && courseId
        ? { enrollments: { some: { courseId } } }
        : scope === "generation"
          ? { facultyId: me.facultyId ?? undefined, year: me.year ?? undefined }
          : { facultyId: me.facultyId ?? undefined },
    select: { id: true, name: true, username: true, avatar: true, isVerified: true },
    take: 500,
  });

  if (participants.length === 0) return null;
  const ids = participants.map((person) => person.id);

  const [materials, acceptedAnswers, answers, posts, comments] = await Promise.all([
    db.material.groupBy({
      by: ["uploaderId"],
      where: { uploaderId: { in: ids }, createdAt: { gte: since }, isHidden: false },
      _count: { uploaderId: true },
    }),
    db.answer.groupBy({
      by: ["authorId"],
      where: {
        authorId: { in: ids },
        createdAt: { gte: since },
        question: { acceptedAnswerId: { not: null } },
      },
      _count: { authorId: true },
    }),
    db.answer.groupBy({
      by: ["authorId"],
      where: { authorId: { in: ids }, createdAt: { gte: since } },
      _count: { authorId: true },
    }),
    db.post.groupBy({
      by: ["authorId"],
      where: { authorId: { in: ids }, createdAt: { gte: since }, isHidden: false },
      _count: { authorId: true },
    }),
    db.comment.groupBy({
      by: ["authorId"],
      where: { authorId: { in: ids }, createdAt: { gte: since }, isHidden: false },
      _count: { authorId: true },
    }),
  ]);

  const points = new Map<string, number>();
  const add = (id: string, value: number) =>
    points.set(id, (points.get(id) ?? 0) + value);

  for (const row of materials) add(row.uploaderId, row._count.uploaderId * XP_VALUES.materialUpload);
  for (const row of acceptedAnswers) add(row.authorId, row._count.authorId * XP_VALUES.acceptedAnswer);
  for (const row of answers) add(row.authorId, row._count.authorId * XP_VALUES.answer);
  for (const row of posts) add(row.authorId, row._count.authorId * XP_VALUES.post);
  for (const row of comments) add(row.authorId, row._count.authorId * XP_VALUES.comment);

  const ranked = participants
    .map((person) => ({ person, points: points.get(person.id) ?? 0 }))
    .filter((entry) => entry.points > 0)
    .sort((a, b) => b.points - a.points || a.person.name.localeCompare(b.person.name, "sq"))
    .map((entry, index) => ({
      rank: index + 1,
      userId: entry.person.id,
      name: entry.person.name,
      username: entry.person.username,
      avatar: entry.person.avatar,
      isVerified: entry.person.isVerified,
      points: entry.points,
      isMe: entry.person.id === userId,
    }));

  const label =
    scope === "course"
      ? "Lënda"
      : scope === "generation"
        ? `${me.faculty?.name?.replace("Fakulteti i ", "").replace("Fakulteti ", "") ?? "Gjenerata"}, viti ${me.year ?? ""}`
        : (me.faculty?.name ?? "Fakulteti");

  return {
    label,
    rows: ranked.slice(0, 10),
    me: ranked.find((row) => row.isMe) ?? null,
    totalParticipants: ranked.length,
  };
}

/**
 * Gara e përhershme mes fakulteteve: cili ka ndarë më shumë dije këtë muaj.
 * Krijon identitet kolektiv pa e poshtëruar askënd individualisht.
 */
export async function getFacultyRace() {
  const since = new Date();
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const faculties = await db.faculty.findMany({
    where: { university: { abbr: "UP" } },
    select: { id: true, name: true, color: true },
  });

  const rows = await Promise.all(
    faculties.map(async (faculty) => {
      const [materials, answers] = await Promise.all([
        db.material.count({
          where: {
            createdAt: { gte: since },
            isHidden: false,
            course: { department: { facultyId: faculty.id } },
          },
        }),
        db.answer.count({
          where: {
            createdAt: { gte: since },
            question: { course: { department: { facultyId: faculty.id } } },
          },
        }),
      ]);

      return {
        id: faculty.id,
        name: faculty.name,
        color: faculty.color,
        materials,
        answers,
        points: materials * XP_VALUES.materialUpload + answers * XP_VALUES.answer,
      };
    }),
  );

  return rows.sort((a, b) => b.points - a.points);
}
