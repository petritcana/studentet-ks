"use server";

import { revalidatePath } from "next/cache";
import { db, parseList, serializeList } from "@/lib/db";
import { notifyJobMatches } from "@/lib/job-alerts";
import { requireUser, requireParticipant } from "@/lib/session";
import { can } from "@/lib/permissions";
import { APPLICATION_STATES, type ApplicationState } from "@/lib/constants";
import { fail, succeed, type ActionState } from "./types";

export async function setApplicationState(
  jobId: string,
  status: string,
  note?: string,
): Promise<ActionState & { status?: string }> {
  // Ruajtja e një pune është vetëm për studentin; aplikimi pret miratimin e ID-së.
  const me = status === "saved" ? await requireUser() : await requireParticipant();

  if (!APPLICATION_STATES.includes(status as ApplicationState)) return fail("errors.generic");

  const job = await db.jobPost.findUnique({ where: { id: jobId }, select: { id: true } });
  if (!job) return fail("errors.notFoundContent");

  const applied = status === "applied" || status === "interview" || status === "accepted";

  await db.application.upsert({
    where: { userId_jobId: { userId: me.id, jobId } },
    create: {
      userId: me.id,
      jobId,
      status,
      note: note?.trim() || null,
      appliedAt: applied ? new Date() : null,
    },
    update: {
      status,
      note: note?.trim() || undefined,
      appliedAt: applied ? new Date() : null,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/karriera");
  return { ...succeed("career.saved"), status };
}

export async function removeApplication(jobId: string): Promise<ActionState> {
  const me = await requireUser();
  await db.application.deleteMany({ where: { userId: me.id, jobId } });
  revalidatePath("/karriera");
  return succeed();
}

export async function saveCareerProfile(input: {
  visibility: string;
  headline?: string;
  summary?: string;
  skills: string[];
  languages: string[];
  desiredRoles: string[];
  preferredCity?: string;
  portfolioUrl?: string;
  openToWork: boolean;
}): Promise<ActionState> {
  const me = await requireUser();

  const visibilities = ["private", "students", "employers", "public"];
  if (!visibilities.includes(input.visibility)) return fail("errors.generic");

  const clean = (values: string[]) =>
    serializeList(values.map((value) => value.trim()).filter(Boolean).slice(0, 30));

  await db.careerProfile.upsert({
    where: { userId: me.id },
    create: {
      userId: me.id,
      visibility: input.visibility,
      headline: input.headline?.trim() || null,
      summary: input.summary?.trim() || null,
      skills: clean(input.skills),
      languages: clean(input.languages),
      desiredRoles: clean(input.desiredRoles),
      preferredCity: input.preferredCity?.trim() || null,
      portfolioUrl: input.portfolioUrl?.trim() || null,
      openToWork: input.openToWork,
    },
    update: {
      visibility: input.visibility,
      headline: input.headline?.trim() || null,
      summary: input.summary?.trim() || null,
      skills: clean(input.skills),
      languages: clean(input.languages),
      desiredRoles: clean(input.desiredRoles),
      preferredCity: input.preferredCity?.trim() || null,
      portfolioUrl: input.portfolioUrl?.trim() || null,
      openToWork: input.openToWork,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/karriera");
  revalidatePath("/pune/cv");
  return succeed("career.profileSaved");
}

/** Lexon profilin e karrierës me listat e shpaketuara. */
export async function getMyCareerProfile() {
  const me = await requireUser();
  const profile = await db.careerProfile.findUnique({ where: { userId: me.id } });
  if (!profile) return null;

  return {
    ...profile,
    skills: parseList(profile.skills),
    languages: parseList(profile.languages),
    desiredRoles: parseList(profile.desiredRoles),
  };
}

/** Shpallja e punës nga kompania. Studentët nuk e kanë këtë veprim. */
export async function postJob(input: {
  title: string;
  type: string;
  field: string;
  city: string;
  isRemote: boolean;
  description: string;
  deadline: string;
  link?: string;
}): Promise<ActionState & { id?: string }> {
  const me = await requireParticipant();

  if (!can(me.actor, "post_job").allowed) return fail("errors.forbidden");

  const company = await db.company.findFirst({
    where: { name: me.name },
    select: { id: true },
  });
  if (!company) return fail("errors.notFoundContent");

  const deadline = new Date(input.deadline);
  if (Number.isNaN(deadline.getTime())) return fail("errors.generic");

  const job = await db.jobPost.create({
    data: {
      companyId: company.id,
      title: input.title.trim(),
      type: input.type,
      field: input.field.trim(),
      city: input.city.trim(),
      isRemote: input.isRemote,
      description: input.description.trim(),
      deadline,
      link: input.link?.trim() || null,
    },
  });

  await notifyJobMatches(job.id);

  revalidatePath("/karriera");
  return { ...succeed(), id: job.id };
}
