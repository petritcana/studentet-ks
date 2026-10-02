import "server-only";

import { db } from "@/lib/db";
import { awardPoints, revokePoints } from "./points";
import { USEFUL_POST_SAVES, type PointSource } from "./rules";

/**
 * Kontributet edukative në garë.
 *
 * Nuk shpërblehet sasia: materiali numërohet kur verifikohet nga moderatori,
 * përgjigjja kur pranohet nga ai që pyeti, postimi kur pesë studentë të tjerë e
 * ruajnë. Kur përmbajtja fshihet ose moderohet, pikët e saj anulohen; kur
 * rikthehet, rikthehen.
 */
const SOURCE_OF: Record<string, PointSource> = {
  material: "material_approved",
  answer: "answer_accepted",
  post: "post_useful",
};


export async function onContentHidden(targetType: string, targetId: string) {
  const source = SOURCE_OF[targetType];
  if (source) await revokePoints(source, targetId);
}

export async function onContentRestored(targetType: string, targetId: string) {
  const source = SOURCE_OF[targetType];
  if (!source) return;
  await db.competitionPoint.updateMany({
    where: { source, sourceId: targetId, revokedAt: { not: null } },
    data: { revokedAt: null },
  });
}

export async function onMaterialVerified(materialId: string, uploaderId: string) {
  await awardPoints({ userId: uploaderId, source: "material_approved", sourceId: materialId });
}

export async function onAnswerAccepted(answerId: string, authorId: string, questionAuthorId: string) {
  // Përgjigjja jote te pyetja jote nuk vlen.
  if (authorId === questionAuthorId) return;
  await awardPoints({ userId: authorId, source: "answer_accepted", sourceId: answerId });
}

/** Postimi i ruajtur nga pesë të tjerë: vetë autori dhe ruajtjet e tij nuk numërohen. */
export async function onPostSaved(postId: string) {
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { authorId: true, isHidden: true, isAnonymous: true },
  });
  if (!post || post.isHidden || post.isAnonymous) return;

  const savers = await db.bookmark.count({
    where: { targetId: postId, targetType: "post", userId: { not: post.authorId } },
  });
  if (savers >= USEFUL_POST_SAVES) {
    await awardPoints({ userId: post.authorId, source: "post_useful", sourceId: postId });
  }
}
