import { db } from "@/lib/db";
import { acceptedFollow } from "@/lib/follow";
import { getSuggestedPeople, type ContextReason, type SuggestedPerson } from "@/lib/suggestions";

/**
 * Njerëzit te Kampusi.
 *
 * Dikur dilnin vetëm sugjerimet për ndjekje, dhe kush ishte ndjekur zhdukej nga
 * lista. Studenti kërkon njerëz me arsye të ndryshme: shokët që i ka, ata që
 * ndjek, fakulteti dhe gjenerata e vet, profesorët, të ardhurit e rinj. Secila
 * pamje ka pyetjen e vet; kërkimi me emër i kalon të gjitha.
 */
export const PEOPLE_VIEWS = ["per-ty", "shoket", "ndjek", "fakulteti", "gjenerata", "profesoret", "te-rinj"] as const;
export type PeopleView = (typeof PEOPLE_VIEWS)[number];

export function isPeopleView(value: unknown): value is PeopleView {
  return typeof value === "string" && (PEOPLE_VIEWS as readonly string[]).includes(value);
}

type Viewer = { id: string; universityId: string | null; facultyId: string | null; year: number | null };

const SELECT = {
  id: true,
  name: true,
  username: true,
  avatar: true,
  bio: true,
  isVerified: true,
  year: true,
  role: true,
  proEarnedUntil: true,
  university: { select: { abbr: true } },
  faculty: { select: { name: true, nameEn: true, color: true } },
  subscriptions: { where: { status: "active" }, select: { expiresAt: true } },
} as const;

type Row = {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  isVerified: boolean;
  year: number | null;
  role: string;
  proEarnedUntil: Date | null;
  university: { abbr: string } | null;
  faculty: { name: string; nameEn: string; color: string } | null;
  subscriptions: { expiresAt: Date }[];
};

function toPerson(row: Row, english: boolean, reasons: ContextReason[] = []): SuggestedPerson {
  const now = new Date();
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    avatar: row.avatar,
    bio: row.bio,
    isVerified: row.isVerified,
    isPro: Boolean(row.proEarnedUntil && row.proEarnedUntil > now) || row.subscriptions.some((item) => item.expiresAt > now),
    universityAbbr: row.university?.abbr ?? null,
    facultyCode: row.faculty?.color ?? null,
    facultyLabel: row.faculty ? (english ? row.faculty.nameEn : row.faculty.name) : null,
    year: row.year,
    score: 0,
    reasons,
  };
}

/** Variantet e shkrimit: Postgres e krahason tekstin me germa të mëdha e të vogla. */
function spellings(query: string) {
  const lower = query.toLocaleLowerCase("sq");
  const title = lower.replace(/(^|[\s.])(\p{L})/gu, (_, gap: string, letter: string) => gap + letter.toLocaleUpperCase("sq"));
  return [...new Set([query, lower, title])];
}

export async function getCampusPeople(
  viewer: Viewer,
  view: PeopleView,
  options: { query?: string; locale?: string; limit?: number } = {},
): Promise<{ people: SuggestedPerson[]; followingIds: string[] }> {
  const english = options.locale === "en";
  const limit = options.limit ?? 24;
  const query = options.query?.trim().replace(/^@/, "").slice(0, 60) ?? "";

  const blocks = await db.userBlock.findMany({
    where: { OR: [{ blockerId: viewer.id }, { blockedId: viewer.id }] },
    select: { blockerId: true, blockedId: true },
  });
  const hidden = [viewer.id, ...blocks.flatMap((row) => [row.blockerId, row.blockedId])];
  const visible = { id: { notIn: hidden }, onboardedAt: { not: null } };

  let people: SuggestedPerson[];

  if (query.length >= 2) {
    const rows = await db.user.findMany({
      where: {
        ...visible,
        OR: spellings(query).flatMap((text) => [
          { name: { contains: text } },
          { username: { contains: text.toLowerCase() } },
          { firstName: { contains: text } },
          { lastName: { contains: text } },
        ]),
      },
      orderBy: [{ isVerified: "desc" }, { name: "asc" }],
      take: limit,
      select: SELECT,
    });
    people = rows.map((row) => toPerson(row, english));
  } else if (view === "per-ty") {
    people = await getSuggestedPeople(viewer.id, limit, { locale: options.locale });
  } else if (view === "shoket" || view === "ndjek") {
    const follows = await db.follow.findMany({
      where: {
        followerId: viewer.id,
        ...acceptedFollow,
        ...(view === "shoket" ? { isMutual: true } : {}),
        followingId: { notIn: hidden },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { isMutual: true, following: { select: SELECT } },
    });
    people = follows.map((follow) =>
      toPerson(follow.following, english, [{ key: follow.isMutual ? "friend" : "youFollow" }]),
    );
  } else if (view === "fakulteti" || view === "gjenerata") {
    if (!viewer.facultyId) return { people: [], followingIds: [] };
    const rows = await db.user.findMany({
      where: {
        ...visible,
        role: "student",
        facultyId: viewer.facultyId,
        ...(view === "gjenerata" ? { year: viewer.year ?? -1 } : {}),
      },
      // Sipas emrit, jo sipas aktivitetit: renditja sipas orës së fundit do ta
      // tregonte kush ishte aktiv, edhe për ata që e kanë fshehur.
      orderBy: [{ isVerified: "desc" }, { name: "asc" }],
      take: limit,
      select: SELECT,
    });
    people = rows.map((row) => toPerson(row, english));
  } else if (view === "profesoret") {
    const rows = await db.user.findMany({
      where: {
        ...visible,
        role: { in: ["professor", "assistant"] },
        ...(viewer.universityId ? { universityId: viewer.universityId } : {}),
      },
      take: 200,
      select: { ...SELECT, facultyId: true },
    });
    // Profesorët e fakultetit tënd dalin të parët.
    rows.sort(
      (a, b) =>
        Number(b.facultyId === viewer.facultyId) - Number(a.facultyId === viewer.facultyId) ||
        a.name.localeCompare(b.name, "sq"),
    );
    people = rows.slice(0, limit).map((row) => toPerson(row, english, [{ key: row.role === "assistant" ? "assistant" : "professor" }]));
  } else {
    const rows = await db.user.findMany({
      where: { ...visible, role: "student", ...(viewer.universityId ? { universityId: viewer.universityId } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: SELECT,
    });
    people = rows.map((row) => toPerson(row, english, [{ key: "joinedRecently" }]));
  }

  const following = people.length
    ? await db.follow.findMany({
        where: { followerId: viewer.id, ...acceptedFollow, followingId: { in: people.map((person) => person.id) } },
        select: { followingId: true },
      })
    : [];

  return { people, followingIds: following.map((row) => row.followingId) };
}
