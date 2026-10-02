import "server-only";

import { db, parseJson } from "@/lib/db";
import { matchesField, matchesLevel, type JobViewer } from "@/lib/job-match";
import { normalizeSearch } from "@/lib/search-text";

/**
 * «Mundësi për ty»: punët që i përshtaten këtij studenti.
 *
 * Dy rregulla, në këtë rend:
 *
 * 1. Fusha duhet të ketë lidhje me të. Një shpallje nga një fushë tjetër (p.sh.
 *    mjekësi për një student të FIEK-ut) nuk del fare, përveç kur studenti vetë
 *    ka treguar interes për atë fushë: e ka hapur, e ka filtruar, e ka ruajtur,
 *    ose e ka te rolet që kërkon. Shpalljet «Të gjitha fushat» vlejnë për këdo.
 * 2. Pastaj rendi: përputhja akademike, çfarë kërkon ai më shumë (shikimet,
 *    filtrat, ruajtjet dhe aplikimet e 90 ditëve të fundit), aftësitë e CV-së,
 *    rolet e dëshiruara, interesat, niveli (viti), qyteti dhe afati.
 *
 * Kur s'ka mjaftueshëm shpallje që i përshtaten, lista del më e shkurtër: një
 * punë e gabuar është më keq se asnjë.
 */

const OPEN_FIELD = "Të gjitha fushat";
const SIGNAL_DAYS = 90;

export type RecommendedJob = {
  id: string;
  title: string;
  type: string;
  field: string;
  city: string;
  isRemote: boolean;
  companyName: string;
  score: number;
};

function words(values: string[]) {
  return values
    .flatMap((value) => normalizeSearch(value).split(/[^a-z0-9]+/))
    .filter((word) => word.length >= 4);
}

export async function recommendJobsFor(userId: string, take = 3): Promise<RecommendedJob[]> {
  const since = new Date(Date.now() - SIGNAL_DAYS * 86_400_000);
  const now = new Date();

  const [user, jobs, signals, applications] = await db.$transaction([
    db.user.findUnique({
      where: { id: userId },
      select: {
        city: true,
        year: true,
        level: true,
        interests: true,
        faculty: { select: { name: true } },
        studyProgram: { select: { name: true } },
        careerProfile: { select: { skills: true, desiredRoles: true } },
      },
    }),
    db.jobPost.findMany({
      where: { deadline: { gte: now } },
      orderBy: { deadline: "asc" },
      take: 120,
      select: {
        id: true,
        title: true,
        type: true,
        field: true,
        city: true,
        isRemote: true,
        description: true,
        skills: true,
        deadline: true,
        createdAt: true,
        company: { select: { name: true } },
      },
    }),
    db.jobSignal.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { field: true, type: true, kind: true },
      take: 400,
    }),
    db.application.findMany({
      where: { userId },
      select: { jobId: true, status: true, job: { select: { field: true, type: true } } },
      take: 200,
    }),
  ]);
  if (!user) return [];

  const viewer: JobViewer = {
    facultyName: user.faculty?.name ?? null,
    programName: user.studyProgram?.name ?? null,
    city: user.city,
    year: user.year,
    level: user.level,
  };
  const knowsPath = Boolean(viewer.facultyName || viewer.programName);

  // Sa herë e ka kërkuar secilën fushë dhe secilin lloj: shikimi 1, filtri 2, ruajtja 3, aplikimi 4.
  const fieldWeight = new Map<string, number>();
  const typeWeight = new Map<string, number>();
  const bump = (map: Map<string, number>, key: string | null | undefined, weight: number) => {
    if (key) map.set(key, (map.get(key) ?? 0) + weight);
  };
  for (const signal of signals) {
    const weight = signal.kind === "filter" ? 2 : 1;
    bump(fieldWeight, signal.field, weight);
    bump(typeWeight, signal.type, weight);
  }
  const applied = new Set<string>();
  for (const row of applications) {
    const weight = row.status === "saved" ? 3 : 4;
    bump(fieldWeight, row.job.field, weight);
    bump(typeWeight, row.job.type, weight);
    if (row.status !== "saved") applied.add(row.jobId);
  }

  const skills = new Set(words(parseJson<string[]>(user.careerProfile?.skills, [])));
  const roles = words(parseJson<string[]>(user.careerProfile?.desiredRoles, []));
  const interests = words(parseJson<string[]>(user.interests, []));

  const scored: RecommendedJob[] = [];
  for (const job of jobs) {
    // Kush ka aplikuar tashmë nuk ka pse ta shohë si «mundësi».
    if (applied.has(job.id)) continue;

    const text = normalizeSearch(`${job.title} ${job.description}`);
    const academic = matchesField(job.field, viewer);
    const sought = fieldWeight.get(job.field) ?? 0;
    const wantedRole = roles.some((role) => text.includes(role));
    const open = job.field === OPEN_FIELD;

    // Rregulli 1: pa lidhje me fushën, shpallja nuk hyn fare.
    if (knowsPath && !open && !academic && sought === 0 && !wantedRole) continue;

    let score = 0;
    if (academic) score += 50;
    if (open) score += 10;
    score += Math.min(sought, 8) * 6;
    score += Math.min(typeWeight.get(job.type) ?? 0, 6) * 3;
    if (wantedRole) score += 20;

    const jobSkills = words(parseJson<string[]>(job.skills, []));
    score += Math.min(jobSkills.filter((skill) => skills.has(skill)).length, 3) * 8;
    if (interests.some((interest) => text.includes(interest))) score += 10;

    if (matchesLevel(job.type, viewer)) score += 15;
    if (viewer.city && (job.city === viewer.city || job.isRemote)) score += 12;

    const daysLeft = (job.deadline.getTime() - now.getTime()) / 86_400_000;
    if (daysLeft <= 7) score += 5;
    if (now.getTime() - job.createdAt.getTime() < 7 * 86_400_000) score += 5;

    scored.push({
      id: job.id,
      title: job.title,
      type: job.type,
      field: job.field,
      city: job.city,
      isRemote: job.isRemote,
      companyName: job.company.name,
      score,
    });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, take);
}

/** Shënon që studenti hapi një shpallje. Një herë në gjashtë orë për të njëjtën shpallje. */
export async function recordJobView(userId: string, job: { id: string; field: string; type: string }) {
  const recent = await db.jobSignal.findFirst({
    where: { userId, jobId: job.id, createdAt: { gte: new Date(Date.now() - 6 * 3_600_000) } },
    select: { id: true },
  });
  if (recent) return;
  await db.jobSignal.create({ data: { userId, jobId: job.id, field: job.field, type: job.type, kind: "view" } });
}

/** Shënon filtrat e Karrierës (fusha, lloji), sepse ato thonë çfarë kërkon. */
export async function recordJobFilter(userId: string, filters: { field?: string | null; type?: string | null }) {
  if (!filters.field && !filters.type) return;
  const recent = await db.jobSignal.findFirst({
    where: {
      userId,
      kind: "filter",
      field: filters.field ?? null,
      type: filters.type ?? null,
      createdAt: { gte: new Date(Date.now() - 3_600_000) },
    },
    select: { id: true },
  });
  if (recent) return;
  await db.jobSignal.create({ data: { userId, field: filters.field ?? null, type: filters.type ?? null, kind: "filter" } });
  // Të vjetrat pastrohen këtu, pa proces në sfond.
  await db.jobSignal.deleteMany({ where: { userId, createdAt: { lt: new Date(Date.now() - 90 * 86_400_000) } } });
}
