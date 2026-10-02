import { db } from "@/lib/db";
import { recommendJobsFor } from "@/lib/job-recommend";
import { matchesField, matchesLevel, type JobViewer } from "@/lib/job-match";

/**
 * Punët, të renditura sipas studentit që i shikon.
 *
 * Profili akademik i mbledhur te hyrja nuk është dekor: fakulteti, programi dhe
 * qyteti vendosin cilat shpallje dalin të parat. Një student i Infermierisë nuk
 * duhet ta kërkojë praktikën e vet nën dhjetë shpallje programimi.
 *
 * Renditja nuk fsheh asgjë: të gjitha shpalljet mbeten aty, vetëm rendi ndryshon.
 * Filtrat, kur vihen, janë absolutë: aty studenti e ka thënë vetë çfarë do.
 */
export type JobFilters = {
  type?: string;
  field?: string;
  city?: string;
  remote?: boolean;
};

export type { JobViewer };

export type ScoredJob = {
  id: string;
  title: string;
  type: string;
  field: string;
  city: string;
  isRemote: boolean;
  description: string;
  deadline: Date;
  company: { name: string; logo: string | null; isVerified: boolean };
  /** Pse doli lart. Bosh do të thotë thjesht afati. */
  reason: "field" | "city" | "level" | null;
};

export async function searchJobs(
  viewer: JobViewer,
  filters: JobFilters = {},
  take = 30,
): Promise<ScoredJob[]> {
  const rows = await db.jobPost.findMany({
    where: {
      deadline: { gte: new Date() },
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.field ? { field: filters.field } : {}),
      ...(filters.city ? { city: filters.city } : {}),
      ...(filters.remote ? { isRemote: true } : {}),
    },
    orderBy: { deadline: "asc" },
    take: 60,
    select: {
      id: true,
      title: true,
      type: true,
      field: true,
      city: true,
      isRemote: true,
      description: true,
      deadline: true,
      company: { select: { name: true, logo: true, isVerified: true } },
    },
  });

  const scored = rows.map((job) => {
    let score = 0;
    let reason: ScoredJob["reason"] = null;

    if (matchesField(job.field, viewer)) {
      score += 50;
      reason = "field";
    }

    if (viewer.city && (job.city === viewer.city || job.isRemote)) {
      score += 20;
      reason = reason ?? "city";
    }

    if (matchesLevel(job.type, viewer)) {
      score += 15;
      reason = reason ?? "level";
    }

    // Afati i afërt ngrihet pak: një shpallje që mbyllet nesër ka rëndësi sot.
    const days = (job.deadline.getTime() - Date.now()) / 86_400_000;
    if (days <= 7) score += 8;

    return { job, score, reason };
  });

  return scored
    .sort((a, b) => b.score - a.score || a.job.deadline.getTime() - b.job.deadline.getTime())
    .slice(0, take)
    .map(({ job, reason }) => ({ ...job, reason }));
}

/** Vlerat që ekzistojnë vërtet te shpalljet, për të ndërtuar filtrat. */
export async function jobFacets() {
  const [fields, cities] = await Promise.all([
    db.jobPost.findMany({
      where: { deadline: { gte: new Date() } },
      distinct: ["field"],
      select: { field: true },
      orderBy: { field: "asc" },
    }),
    db.jobPost.findMany({
      where: { deadline: { gte: new Date() } },
      distinct: ["city"],
      select: { city: true },
      orderBy: { city: "asc" },
    }),
  ]);

  return {
    fields: fields.map((row) => row.field),
    cities: cities.map((row) => row.city),
  };
}

/**
 * Tri mundësi për shtyllën e majtë.
 *
 * E njëjta logjikë si te faqja, e ngushtuar: fakulteti dhe qyteti i studentit
 * vendosin, dhe kur profili nuk thotë asgjë, dalin ato me afat më të afërt.
 */
export type SideJob = {
  id: string;
  title: string;
  type: string;
  city: string;
  isRemote: boolean;
  companyName: string;
};

export async function getRecommendedJobs(
  user: { id: string; facultyId: string | null; city: string | null },
  take = 3,
): Promise<SideJob[]> {
  // I gjithë profili i studentit dhe çfarë kërkon ai: `lib/job-recommend.ts`.
  const jobs = await recommendJobsFor(user.id, take);
  return jobs.map((job) => ({
    id: job.id,
    title: job.title,
    type: job.type,
    city: job.city,
    isRemote: job.isRemote,
    companyName: job.companyName,
  }));
}
