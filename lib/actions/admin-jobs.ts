"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { notifyJobMatches } from "@/lib/job-alerts";
import { JOB_FIELDS } from "@/lib/job-match";
import { requireAdmin } from "@/lib/session";
import { JOB_TYPES } from "@/lib/types";
import { fail, succeed, type ActionState } from "./types";

/**
 * Shpalljet e punës nga admini.
 *
 * Deri tani punët vinin vetëm nga seed-i, dhe njoftimi «punë e re për ty» nuk
 * kishte nga të nisej. Admini publikon në emër të një kompanie ekzistuese, dhe
 * publikimi i njofton menjëherë studentët që i përshtaten.
 */
const jobSchema = z.object({
  companyId: z.string().min(1),
  title: z.string().trim().min(3).max(120),
  type: z.enum(JOB_TYPES),
  field: z.enum(JOB_FIELDS),
  city: z.string().trim().min(2).max(60),
  isRemote: z.boolean(),
  description: z.string().trim().min(20).max(4000),
  requirements: z.string().trim().max(2000).optional(),
  salary: z.string().trim().max(80).optional(),
  deadline: z.string().min(1),
  link: z
    .string()
    .trim()
    .max(300)
    .refine((value) => value === "" || value.startsWith("https://"))
    .optional(),
});

export type AdminJobInput = z.input<typeof jobSchema>;

export async function publishJob(input: AdminJobInput): Promise<ActionState & { notified?: number }> {
  const admin = await requireAdmin();

  const parsed = jobSchema.safeParse(input);
  if (!parsed.success) return fail("adminJobs.invalid");
  const data = parsed.data;

  const deadline = new Date(data.deadline);
  // Një afat që ka kaluar nuk është shpallje, është arkiv.
  if (Number.isNaN(deadline.getTime()) || deadline.getTime() < Date.now()) {
    return fail("adminJobs.deadlinePast");
  }

  const company = await db.company.findUnique({ where: { id: data.companyId }, select: { id: true } });
  if (!company) return fail("adminJobs.invalid");

  const job = await db.jobPost.create({
    data: {
      companyId: company.id,
      title: data.title,
      type: data.type,
      field: data.field,
      city: data.city,
      isRemote: data.isRemote,
      description: data.description,
      requirements: data.requirements || null,
      salary: data.salary || null,
      deadline,
      link: data.link || null,
    },
    select: { id: true },
  });

  const notified = await notifyJobMatches(job.id);
  await recordAudit({ actorId: admin.id, action: "job_publish", targetType: "job", targetId: job.id });

  revalidatePath("/karriera");
  revalidatePath("/admin/punet");
  return { ...succeed("adminJobs.published"), notified };
}

export async function removeJob(jobId: string): Promise<ActionState> {
  const admin = await requireAdmin();
  const job = await db.jobPost.findUnique({ where: { id: jobId }, select: { id: true } });
  if (!job) return fail("errors.notFoundContent");

  // Afati mbyllet tani: aplikimet e dërguara mbeten te gjurmuesi i studentit.
  await db.jobPost.update({ where: { id: jobId }, data: { deadline: new Date(Date.now() - 1000) } });
  await recordAudit({ actorId: admin.id, action: "job_close", targetType: "job", targetId: jobId });

  revalidatePath("/karriera");
  revalidatePath("/admin/punet");
  return succeed();
}
