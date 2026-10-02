"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { extractPages, indexMaterial } from "@/lib/materials/extract";
import { requireUser, requireParticipant } from "@/lib/session";
import { canDownloadMaterial } from "@/lib/access";
import { rateLimit } from "@/lib/rate-limit";
import { screen } from "@/lib/moderation";
import { awardActivityXp, revokeMaterialReward, rewardMaterialMilestone } from "@/lib/rewards";
import {
  decideQuality,
  isHiddenState,
  POSITIVE_RATING,
  type VerificationState,
} from "@/lib/quality";
import { MAX_UPLOAD_BYTES, MILESTONE_DOWNLOADS } from "@/lib/constants";
import { ACADEMIC_YEAR, MATERIAL_TYPES } from "@/lib/types";
import { fail, succeed, type ActionState } from "./types";

const uploadSchema = z.object({
  title: z.string().trim().min(4).max(160),
  type: z.enum(MATERIAL_TYPES),
  courseId: z.string().min(1),
  academicYear: z.string().trim().min(4).max(12),
  professor: z.string().trim().max(120).optional(),
  pages: z.number().int().min(1).max(5000).optional(),
  description: z.string().trim().max(1000).optional(),
  rightsConfirmed: z.literal(true),
});

export async function uploadMaterial(formData: FormData): Promise<ActionState & { id?: string }> {
  const me = await requireParticipant();

  const limit = rateLimit("upload", me.id);
  if (!limit.ok) return fail("material.errorLimit");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("material.errorSize");
  if (file.size > MAX_UPLOAD_BYTES) return fail("errors.uploadTooLarge");

  const parsed = uploadSchema.safeParse({
    title: formData.get("title"),
    type: formData.get("type"),
    courseId: formData.get("courseId"),
    academicYear: formData.get("academicYear") || ACADEMIC_YEAR,
    professor: formData.get("professor") || undefined,
    pages: formData.get("pages") ? Number(formData.get("pages")) : undefined,
    description: formData.get("description") || undefined,
    rightsConfirmed: formData.get("rightsConfirmed") === "true",
  });
  if (!parsed.success) {
    return fail(
      parsed.error.issues.some((issue) => issue.path[0] === "rightsConfirmed")
        ? "material.errorRights"
        : "material.errorTitle",
    );
  }

  const data = parsed.data;

  // Vetëm lëndët që ekzistojnë, dhe vetëm ato brenda rrethit falas të ngarkuesit.
  const course = await db.course.findUnique({
    where: { id: data.courseId },
    select: { id: true, name: true, department: { select: { facultyId: true } } },
  });
  if (!course) return fail("material.errorCourse");

  const verdict = await screen(`${data.title} ${data.description ?? ""}`);
  if (!verdict.allowed) return fail(`guard.${verdict.category}`);

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileHash = createHash("sha256").update(buffer).digest("hex");

  const duplicate = await db.material.findUnique({
    where: { fileHash },
    select: { id: true },
  });
  if (duplicate) return fail("material.errorDuplicate");

  const material = await db.material.create({
    data: {
      uploaderId: me.id,
      courseId: course.id,
      title: data.title,
      type: data.type,
      fileUrl: `/materialet/skedaret/${fileHash}`,
      fileHash,
      size: file.size,
      pages: data.pages ?? null,
      academicYear: data.academicYear,
      professor: data.professor ?? null,
      description: data.description ?? null,
      verificationStatus: "pending",
    },
  });

  /*
    Teksti i skedarit, që asistenti ta lexojë vërtet: faqe për faqe te PDF-ja,
    slajd për slajd te PPTX-i, transkriptim te fotot. Kur nuk lexohet, materiali
    mbetet me titullin dhe përshkrimin, dhe ngarkimi nuk dështon për këtë.
  */
  const pages = await extractPages(buffer, file.name, file.type);
  await indexMaterial(material.id, `${data.title}. ${data.description ?? ""} Lënda ${course.name}.`, pages);
  if (!data.pages && pages.length > 1) {
    await db.material.update({ where: { id: material.id }, data: { pages: pages.length } });
  }

  await awardActivityXp(me.id, "post");

  revalidatePath("/materialet");
  revalidatePath("/une");
  return { ...succeed("material.uploaded"), id: material.id };
}

/** Vlerësimi. Askush nuk e vlerëson materialin e vet. */
export async function rateMaterial(materialId: string, stars: number): Promise<ActionState> {
  const me = await requireParticipant();
  if (stars < 1 || stars > 5) return fail("errors.generic");

  const material = await db.material.findUnique({
    where: { id: materialId },
    select: { uploaderId: true, verificationStatus: true, rewardedAt: true },
  });
  if (!material) return fail("errors.notFoundContent");
  if (material.uploaderId === me.id) return fail("material.rateOwn");

  await db.materialRating.upsert({
    where: { materialId_userId: { materialId, userId: me.id } },
    create: { materialId, userId: me.id, value: stars },
    update: { value: stars },
  });

  const [aggregate, positive] = await Promise.all([
    db.materialRating.aggregate({
      where: { materialId },
      _avg: { value: true },
      _count: { value: true },
    }),
    db.materialRating.count({ where: { materialId, value: { gte: POSITIVE_RATING } } }),
  ]);

  const rating = aggregate._avg.value ?? 0;
  const ratingCount = aggregate._count.value;

  // Tubi i cilesise vendos vetë, nga te njejtat sinjale kudo.
  const decision = decideQuality({
    status: material.verificationStatus as VerificationState,
    rating,
    ratingCount,
    positiveCount: positive,
    reviewedByStaff: material.verificationStatus === "verified",
  });

  await db.material.update({
    where: { id: materialId },
    data: {
      rating,
      ratingCount,
      verificationStatus: decision.status,
      isHidden: isHiddenState(decision.status),
    },
  });

  // Heqja automatike e kthen mbrapsht edhe shperblimin: ndryshe, një material i
  // keq do te kishte paguar njesoj si një i mirë.
  if (decision.status === "rejected" && material.rewardedAt) {
    await revokeMaterialReward(materialId, material.uploaderId);
  }

  revalidatePath(`/materialet/${materialId}`);
  return succeed("material.rated");
}

/**
 * Shkarkimi.
 *
 * E vetmja pikë ku qasja vendos me të vërtetë: parapamja lejohet kudo, hyrja jo.
 * Kalimi i pragut prej 100 shkarkimesh shpërblehet një herë të vetme.
 */
export async function registerDownload(
  materialId: string,
): Promise<ActionState & { url?: string }> {
  const me = await requireUser();

  const material = await db.material.findUnique({
    where: { id: materialId },
    select: {
      id: true,
      fileUrl: true,
      isHidden: true,
      uploaderId: true,
      courseId: true,
      downloads: true,
      course: {
        select: {
          department: {
            select: { facultyId: true, faculty: { select: { universityId: true } } },
          },
        },
      },
    },
  });
  if (!material) return fail("errors.notFoundContent");

  if (!canDownloadMaterial(me.access, material).allowed) return fail("pro.lockedScopeTitle");

  const updated = await db.material.update({
    where: { id: materialId },
    data: { downloads: { increment: 1 } },
    select: { downloads: true, uploaderId: true },
  });

  if (updated.downloads >= MILESTONE_DOWNLOADS) {
    await rewardMaterialMilestone(materialId);
  }

  revalidatePath(`/materialet/${materialId}`);
  return { ...succeed(), url: material.fileUrl };
}
