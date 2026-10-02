import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { battleView, createChallenge, respondChallenge, settleBattle, startEntry, submitAnswer } from "@/lib/competition/battles";
import { onContentHidden, onContentRestored, onPostSaved } from "@/lib/competition/contributions";
import { dailyBattle } from "@/lib/competition/daily";
import { awardPoints } from "@/lib/competition/points";
import { DAILY_POINT_CAP, POINTS, USEFUL_POST_SAVES, weekOf } from "@/lib/competition/rules";
import { finalizePreviousWeek, universityStandings } from "@/lib/competition/weekly";

/**
 * Gara mbi bazën e vërtetë: rregullat që një klient keqdashës do të provonte t'i
 * anashkalonte. Çdo test pastron atë që krijon.
 */

type Person = { id: string; isVerified: boolean; universityId: string | null };

let dea: Person;
let ardit: Person;
let arian: Person;

async function person(username: string): Promise<Person> {
  const user = await db.user.findUniqueOrThrow({
    where: { username },
    select: { id: true, isVerified: true, universityId: true },
  });
  return user;
}

async function wipe() {
  await db.battle.deleteMany({});
  await db.teamEvent.deleteMany({});
  await db.competitionPoint.deleteMany({});
  await db.competitorStats.deleteMany({});
  await db.competitionEvent.deleteMany({});
  await db.competitionWeek.deleteMany({});
  await db.rankSnapshot.deleteMany({});
  await db.universityAchievement.deleteMany({});
  await db.userBadge.deleteMany({ where: { badge: { code: { startsWith: "comp_" } } } });
  await db.notification.deleteMany({ where: { category: "competition" } });
}

async function answerAll(user: Person, battleId: string, rightCount: number) {
  const battle = await db.battle.findUniqueOrThrow({ where: { id: battleId }, select: { questionIds: true } });
  const ids: string[] = JSON.parse(battle.questionIds);
  const keys = await db.quizQuestion.findMany({ where: { id: { in: ids } }, select: { id: true, correctIndex: true } });
  for (const [index, id] of ids.entries()) {
    const right = keys.find((key) => key.id === id)!.correctIndex;
    await submitAnswer(user, battleId, id, index < rightCount ? right : (right + 1) % 4);
  }
  return ids;
}

let createdFollow = false;

beforeAll(async () => {
  await wipe();
  dea = await person("dea.morina");
  ardit = await person("ardit.selimi");
  arian = await person("arian.bytyqi");
  // Sfida lejohet vetëm mes njerëzve të lidhur; seed-i nuk i lidh këta të dy.
  createdFollow = !(await db.follow.findFirst({ where: { followerId: dea.id, followingId: ardit.id } }));
  if (createdFollow) await db.follow.create({ data: { followerId: dea.id, followingId: ardit.id, status: "accepted" } });
});

afterAll(async () => {
  if (createdFollow) await db.follow.deleteMany({ where: { followerId: dea.id, followingId: ardit.id } });
  await wipe();
  await db.$disconnect();
});

describe("beteja nga sfida te rezultati", () => {
  it("të dy marrin të njëjtat pyetje, fituesi dhe pikët llogariten saktë", async () => {
    const battleId = await createChallenge(dea, ardit.id, "economics");
    expect(await db.notification.count({ where: { userId: ardit.id, type: "battle_challenge" } })).toBe(1);

    await startEntry(dea, battleId);
    const deaIds = await answerAll(dea, battleId, 5);

    await respondChallenge(ardit, battleId, true);
    await startEntry(ardit, battleId);
    const arditIds = await answerAll(ardit, battleId, 3);
    expect(arditIds).toEqual(deaIds);

    const battle = await db.battle.findUniqueOrThrow({ where: { id: battleId } });
    expect(battle.status).toBe("finished");
    expect(battle.winnerId).toBe(dea.id);

    const deaPoints = await db.competitionPoint.findMany({ where: { userId: dea.id }, select: { source: true, points: true, universityId: true } });
    expect(deaPoints.map((row) => row.source).sort()).toEqual(["battle_complete", "battle_win"]);
    expect(deaPoints.every((row) => row.universityId === dea.universityId)).toBe(true);
    const arditPoints = await db.competitionPoint.findMany({ where: { userId: ardit.id } });
    expect(arditPoints.map((row) => row.source)).toEqual(["battle_complete"]);

    const stats = await db.competitorStats.findUniqueOrThrow({ where: { userId: dea.id } });
    expect(stats.wins).toBe(1);
    expect(stats.battles).toBe(1);
    expect(stats.rating).toBeGreaterThan(1000);

    // Fitorja e parë hap arritjen, me njoftim.
    expect(await db.userBadge.count({ where: { userId: dea.id, badge: { code: "comp_first_win" } } })).toBe(1);
    expect(await db.notification.count({ where: { userId: ardit.id, type: "battle_finished" } })).toBe(1);

    // Mbyllja e dytë nuk jep pikë dy herë.
    await settleBattle(battleId, true);
    expect(await db.competitionPoint.count({ where: { userId: dea.id, source: "battle_win" } })).toBe(1);
  });

  it("klienti nuk e kalon dot serverin", async () => {
    // Sfida drejt dikujt me të cilin nuk ka lidhje ndalet.
    await expect(createChallenge(dea, arian.id, "general")).rejects.toMatchObject({ key: "competition.errorNotConnected" });

    const battleId = await createChallenge(dea, ardit.id, "history");
    // Kush nuk është në betejë nuk e sheh dhe nuk luan.
    expect(await battleView(arian, battleId)).toBeNull();
    await expect(startEntry(arian, battleId)).rejects.toMatchObject({ key: "competition.errorCannotPlay" });
    // Kundërshtari nuk luan para se ta pranojë.
    await expect(startEntry(ardit, battleId)).rejects.toMatchObject({ key: "competition.errorCannotPlay" });

    await startEntry(dea, battleId);
    // Pyetje që nuk i përket betejës.
    const outside = await db.quizQuestion.findFirstOrThrow({ where: { category: "medicine" }, select: { id: true } });
    await expect(submitAnswer(dea, battleId, outside.id, 0)).rejects.toMatchObject({ key: "competition.errorCannotPlay" });

    // E njëjta pyetje dy herë.
    const battle = await db.battle.findUniqueOrThrow({ where: { id: battleId }, select: { questionIds: true } });
    const first = (JSON.parse(battle.questionIds) as string[])[0];
    await submitAnswer(dea, battleId, first, 0);
    await expect(submitAnswer(dea, battleId, first, 1)).rejects.toMatchObject({ key: "competition.errorAnswered" });

    // Përgjigjja pas afatit nuk pranohet: afati mbahet te serveri.
    await db.battleEntry.updateMany({
      where: { battleId, userId: dea.id },
      data: { startedAt: new Date(Date.now() - 10 * 60_000) },
    });
    const second = (JSON.parse(battle.questionIds) as string[])[1];
    await expect(submitAnswer(dea, battleId, second, 0)).rejects.toMatchObject({ key: "competition.errorTimeUp" });

    // Loja e braktisur nuk jep pikë pjesëmarrjeje.
    expect(await db.competitionPoint.count({ where: { source: "battle_complete", sourceId: battleId } })).toBe(0);
  });
});

describe("kuizi ditor", () => {
  it("luhet një herë dhe nuk shfrytëzohet për pikë", async () => {
    const battleId = await dailyBattle();
    expect(await dailyBattle()).toBe(battleId);

    await startEntry(dea, battleId);
    await answerAll(dea, battleId, 4);
    // Hyrja e dytë nuk krijohet: kthehet e njëjta, e mbyllur.
    const again = await startEntry(dea, battleId);
    const entry = await db.battleEntry.findUniqueOrThrow({ where: { id: again } });
    expect(entry.finishedAt).not.toBeNull();

    const ids: string[] = JSON.parse((await db.battle.findUniqueOrThrow({ where: { id: battleId } })).questionIds);
    await expect(submitAnswer(dea, battleId, ids[0], 0)).rejects.toMatchObject({ key: "competition.errorCannotPlay" });

    const points = await db.competitionPoint.findMany({ where: { userId: dea.id, source: "daily_quiz" } });
    expect(points).toHaveLength(1);
    expect(points[0].points).toBe(4 * POINTS.daily_quiz);
  });
});

describe("kontributet dhe anulimi", () => {
  it("postimi i dobishëm numërohet pas pesë ruajtjeve nga të tjerët, dhe fshirja e anulon", async () => {
    const post = await db.post.create({
      data: { authorId: ardit.id, type: "post", scope: "faculty", text: "Shënimet e mia për Mikroekonominë, kapitulli 3." },
      select: { id: true },
    });
    const savers = await db.user.findMany({ where: { id: { notIn: [ardit.id] } }, take: USEFUL_POST_SAVES, select: { id: true } });
    for (const [index, saver] of savers.entries()) {
      await db.bookmark.create({ data: { userId: saver.id, targetId: post.id, targetType: "post" } });
      await onPostSaved(post.id);
      const count = await db.competitionPoint.count({ where: { source: "post_useful", sourceId: post.id } });
      expect(count).toBe(index + 1 >= USEFUL_POST_SAVES ? 1 : 0);
    }

    await onContentHidden("post", post.id);
    const revoked = await db.competitionPoint.findFirstOrThrow({ where: { source: "post_useful", sourceId: post.id } });
    expect(revoked.revokedAt).not.toBeNull();
    const standings = await universityStandings();
    const ubt = standings.find((row) => row.universityId === ardit.universityId);
    expect(ubt?.contributions ?? 0).toBe(0);

    await onContentRestored("post", post.id);
    expect((await db.competitionPoint.findFirstOrThrow({ where: { sourceId: post.id } })).revokedAt).toBeNull();

    await db.bookmark.deleteMany({ where: { targetId: post.id } });
    await db.post.delete({ where: { id: post.id } });
  });

  it("i njëjti veprim nuk numërohet dy herë, dhe tavani ditor mban", async () => {
    expect(await awardPoints({ userId: ardit.id, source: "material_approved", sourceId: "material-x" })).toBe(POINTS.material_approved);
    expect(await awardPoints({ userId: ardit.id, source: "material_approved", sourceId: "material-x" })).toBe(0);

    for (let index = 0; index < 20; index += 1) {
      await awardPoints({ userId: ardit.id, source: "answer_accepted", sourceId: `answer-${index}` });
    }
    const today = await db.competitionPoint.aggregate({ where: { userId: ardit.id, revokedAt: null }, _sum: { points: true } });
    expect(today._sum.points).toBeLessThanOrEqual(DAILY_POINT_CAP);
    expect(await db.competitionPoint.count({ where: { userId: ardit.id, source: "answer_accepted" } })).toBe(5);
  });

  it("studenti i paverifikuar mbledh për vete, por jo për universitetin", async () => {
    await awardPoints({ userId: arian.id, source: "material_approved", sourceId: "material-arian" });
    const row = await db.competitionPoint.findFirstOrThrow({ where: { userId: arian.id } });
    expect(row.points).toBeGreaterThan(0);
    expect(row.universityId).toBeNull();
  });
});

describe("java e garës", () => {
  it("mbyllet një herë, me arritjet dhe njoftimet e universiteteve", async () => {
    const previous = weekOf(new Date(Date.now() - 7 * 86_400_000));
    await db.competitionPoint.create({
      data: {
        userId: dea.id,
        universityId: dea.universityId,
        source: "battle_win",
        sourceId: "last-week-battle",
        points: 40,
        createdAt: new Date(previous.startsAt.getTime() + 3_600_000),
      },
    });

    expect(await finalizePreviousWeek()).toBe(true);
    expect(await finalizePreviousWeek()).toBe(false);

    const week = await db.competitionWeek.findUniqueOrThrow({ where: { weekKey: previous.key } });
    const results = JSON.parse(week.results) as { universityId: string; rank: number }[];
    expect(results[0].universityId).toBe(dea.universityId);
    expect(
      await db.universityAchievement.count({ where: { code: "weekly_champion", period: previous.key, universityId: dea.universityId! } }),
    ).toBe(1);
    expect(await db.notification.count({ where: { userId: dea.id, type: "weekly_result" } })).toBe(1);
  });
});
