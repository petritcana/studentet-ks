"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, requireParticipant } from "@/lib/session";
import { can } from "@/lib/permissions";
import { getProvider } from "@/lib/billing/providers";
import { splitSale, reverseSplit, withinRefundWindow } from "@/lib/billing/ledger";
import { screen } from "@/lib/moderation";
import { fail, succeed, type ActionState } from "./types";

/**
 * Krijimi i kursit.
 *
 * Vetëm profesorë dhe asistentë të verifikuar, sipas `can()`. Fillon si draft:
 * asnjë kurs me pagesë nuk del publik pa kaluar nga shqyrtimi i platformës.
 */
export async function createCourse(input: {
  title: string;
  subtitle?: string;
  description: string;
  category: string;
  language: string;
  level: string;
  priceCents: number;
}): Promise<ActionState & { id?: string }> {
  const me = await requireParticipant();

  if (!can(me.actor, "create_course").allowed) return fail("errors.forbidden");

  const title = input.title.trim();
  if (title.length < 6 || input.description.trim().length < 20) return fail("errors.generic");

  const verdict = await screen(`${title} ${input.description}`);
  if (!verdict.allowed) return fail(`guard.${verdict.category}`);

  const course = await db.onlineCourse.create({
    data: {
      instructorId: me.id,
      title,
      subtitle: input.subtitle?.trim() || null,
      description: input.description.trim(),
      category: input.category.trim(),
      language: input.language === "en" ? "en" : "sq",
      level: input.level,
      priceCents: Math.max(0, Math.round(input.priceCents)),
      facultyId: me.facultyId,
      status: "draft",
    },
  });

  revalidatePath("/kurset");
  return { ...succeed("courses.created"), id: course.id };
}

/** Dërgimi për shqyrtim. Profesori nuk e publikon vetë një kurs me pagesë. */
export async function submitCourseForReview(courseId: string): Promise<ActionState> {
  const me = await requireUser();

  const course = await db.onlineCourse.findUnique({
    where: { id: courseId },
    select: { instructorId: true, status: true, sections: { select: { id: true } } },
  });
  if (!course) return fail("errors.notFoundContent");
  if (course.instructorId !== me.id) return fail("errors.forbidden");
  if (course.sections.length === 0) return fail("courses.errorNoContent");

  await db.onlineCourse.update({
    where: { id: courseId },
    data: { status: "in_review", updatedAt: new Date() },
  });

  revalidatePath("/kurset");
  return succeed("courses.submitted");
}

/** Vendimi i platformës mbi publikimin. */
export async function decideCoursePublication(
  courseId: string,
  decision: "publish" | "reject",
): Promise<ActionState> {
  const me = await requireUser();

  if (!can(me.actor, "publish_course").allowed) return fail("errors.forbidden");

  await db.onlineCourse.update({
    where: { id: courseId },
    data: {
      status: decision === "publish" ? "published" : "draft",
      publishedAt: decision === "publish" ? new Date() : null,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/kurset");
  revalidatePath("/moderimi");
  return succeed();
}

export async function saveSection(input: {
  courseId: string;
  sectionId?: string;
  title: string;
  order: number;
}): Promise<ActionState & { id?: string }> {
  const me = await requireUser();

  const course = await db.onlineCourse.findUnique({
    where: { id: input.courseId },
    select: { instructorId: true },
  });
  if (!course || course.instructorId !== me.id) return fail("errors.forbidden");

  const section = input.sectionId
    ? await db.courseSection.update({
        where: { id: input.sectionId },
        data: { title: input.title.trim(), order: input.order },
      })
    : await db.courseSection.create({
        data: { courseId: input.courseId, title: input.title.trim(), order: input.order },
      });

  revalidatePath(`/kurset/${input.courseId}/ndrysho`);
  return { ...succeed(), id: section.id };
}

export async function saveLesson(input: {
  sectionId: string;
  lessonId?: string;
  title: string;
  kind: string;
  content: string;
  duration?: number;
  isPreview: boolean;
  order: number;
}): Promise<ActionState & { id?: string }> {
  const me = await requireUser();

  const section = await db.courseSection.findUnique({
    where: { id: input.sectionId },
    select: { courseId: true, course: { select: { instructorId: true } } },
  });
  if (!section || section.course.instructorId !== me.id) return fail("errors.forbidden");

  const data = {
    title: input.title.trim(),
    kind: input.kind,
    content: input.content,
    duration: input.duration ?? null,
    isPreview: input.isPreview,
    order: input.order,
  };

  const lesson = input.lessonId
    ? await db.lesson.update({ where: { id: input.lessonId }, data })
    : await db.lesson.create({ data: { ...data, sectionId: input.sectionId } });

  revalidatePath(`/kurset/${section.courseId}/ndrysho`);
  return { ...succeed(), id: lesson.id };
}

/**
 * Blerja e kursit.
 *
 * Kjo është pika ku paratë ndahen. Çdo shitje shkruan një rresht te libri, me
 * bruton, tarifën e platformës dhe netto e instruktorit të ndara qartë, sepse
 * një raport që nuk mbledh saktë nuk vlen asgjë.
 */
export async function enrollInCourse(
  courseId: string,
  providerCode: string = "mock",
): Promise<ActionState & { redirectUrl?: string }> {
  const me = await requireUser();

  const course = await db.onlineCourse.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      priceCents: true,
      currency: true,
      status: true,
      instructorId: true,
      title: true,
    },
  });
  if (!course) return fail("errors.notFoundContent");
  if (course.status !== "published" && course.status !== "unlisted") {
    return fail("courses.errorNotPublished");
  }
  if (course.instructorId === me.id) return fail("courses.errorOwnCourse");

  const existing = await db.courseEnrollment.findUnique({
    where: { courseId_userId: { courseId, userId: me.id } },
    select: { id: true },
  });
  if (existing) return succeed("courses.alreadyEnrolled");

  // Kursi falas nuk prek fare shtresën e pagesave.
  if (course.priceCents === 0) {
    await db.courseEnrollment.create({
      data: { courseId, userId: me.id, source: "free" },
    });
    revalidatePath(`/kurset/${courseId}`);
    return succeed("courses.enrolled");
  }

  const provider = getProvider(providerCode as never);
  if (!provider.isAvailable()) return fail("proPage.paymentUnavailable");

  const checkout = await provider.createCheckout({
    userId: me.id,
    planCode: `course-${course.id}`,
    amountCents: course.priceCents,
    currency: course.currency,
    hasStudentDiscount: false,
    locale: me.locale ?? "sq",
  });

  if (checkout.kind === "error") return fail(checkout.messageKey);
  if (checkout.kind === "redirect") return { ...succeed(), redirectUrl: checkout.url };
  if (checkout.kind === "instructions") return succeed("proPage.transferBody");

  // Vetëm mock dhe XP arrijnë deri këtu të zgjidhura.
  await recordSale({
    courseId: course.id,
    buyerId: me.id,
    instructorId: course.instructorId,
    grossCents: course.priceCents,
    currency: course.currency,
    paymentId: checkout.paymentId,
  });

  await db.courseEnrollment.create({
    data: { courseId, userId: me.id, source: "payment" },
  });

  revalidatePath(`/kurset/${courseId}`);
  revalidatePath("/kurset/fitimet");
  return succeed("courses.enrolled");
}

/** Shkruan shitjen te libri. E vetmja rrugë me të cilën paratë hyjnë. */
async function recordSale(input: {
  courseId: string;
  buyerId: string;
  instructorId: string;
  grossCents: number;
  currency: string;
  paymentId?: string;
}) {
  const split = splitSale(input.grossCents);

  await db.ledgerEntry.create({
    data: {
      courseId: input.courseId,
      buyerId: input.buyerId,
      instructorId: input.instructorId,
      kind: "sale",
      grossCents: split.grossCents,
      platformCents: split.platformCents,
      instructorCents: split.instructorCents,
      providerCents: split.providerCents,
      currency: input.currency,
      paymentId: input.paymentId ?? null,
    },
  });
}

/** Kthimi i parave brenda dritares. E kthen edhe rreshtin e librit. */
export async function refundCourse(courseId: string): Promise<ActionState> {
  const me = await requireUser();

  const enrollment = await db.courseEnrollment.findUnique({
    where: { courseId_userId: { courseId, userId: me.id } },
    select: { id: true, createdAt: true, source: true },
  });
  if (!enrollment) return fail("errors.notFoundContent");
  if (enrollment.source !== "payment") return fail("errors.generic");
  if (!withinRefundWindow(enrollment.createdAt)) return fail("courses.errorRefundWindow");

  const sale = await db.ledgerEntry.findFirst({
    where: { courseId, buyerId: me.id, kind: "sale" },
    orderBy: { createdAt: "desc" },
  });
  if (!sale) return fail("errors.notFoundContent");

  const reversed = reverseSplit({
    grossCents: sale.grossCents,
    platformCents: sale.platformCents,
    instructorCents: sale.instructorCents,
    providerCents: sale.providerCents,
  });

  await db.ledgerEntry.create({
    data: {
      courseId,
      buyerId: me.id,
      instructorId: sale.instructorId,
      kind: "refund",
      grossCents: reversed.grossCents,
      platformCents: reversed.platformCents,
      instructorCents: reversed.instructorCents,
      providerCents: reversed.providerCents,
      currency: sale.currency,
      note: "refund",
    },
  });

  await db.courseEnrollment.delete({ where: { id: enrollment.id } });

  revalidatePath(`/kurset/${courseId}`);
  return succeed("courses.refunded");
}

/** Shënimi i mësimit si i përfunduar, dhe certifikata kur mbyllet kursi. */
export async function completeLesson(lessonId: string): Promise<ActionState & { certificate?: string }> {
  const me = await requireUser();

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, section: { select: { courseId: true } } },
  });
  if (!lesson) return fail("errors.notFoundContent");

  const courseId = lesson.section.courseId;

  const enrolled = await db.courseEnrollment.findUnique({
    where: { courseId_userId: { courseId, userId: me.id } },
    select: { id: true, completedAt: true },
  });
  if (!enrolled) return fail("errors.forbidden");

  await db.lessonProgress.upsert({
    where: { lessonId_userId: { lessonId, userId: me.id } },
    create: { lessonId, userId: me.id, completed: true },
    update: { completed: true, updatedAt: new Date() },
  });

  // A mbaroi i tëri: atëherë lëshohet certifikata, një herë të vetme.
  const [total, done] = await Promise.all([
    db.lesson.count({ where: { section: { courseId } } }),
    db.lessonProgress.count({
      where: { userId: me.id, completed: true, lesson: { section: { courseId } } },
    }),
  ]);

  if (total > 0 && done >= total && !enrolled.completedAt) {
    const code = randomBytes(5).toString("hex").toUpperCase();
    const certificate = await db.certificate.create({
      data: { userId: me.id, courseId, code },
    });
    await db.courseEnrollment.update({
      where: { id: enrolled.id },
      data: { completedAt: new Date(), certificateId: certificate.id },
    });

    revalidatePath(`/kurset/${courseId}`);
    return { ...succeed("courses.completed"), certificate: code };
  }

  revalidatePath(`/kurset/${courseId}`);
  return succeed();
}

/** Vlerësimi i kursit, vetëm nga ata që janë regjistruar. */
export async function reviewCourse(
  courseId: string,
  stars: number,
  comment?: string,
): Promise<ActionState> {
  const me = await requireParticipant();

  if (stars < 1 || stars > 5) return fail("errors.generic");

  const enrolled = await db.courseEnrollment.findUnique({
    where: { courseId_userId: { courseId, userId: me.id } },
    select: { id: true },
  });
  if (!enrolled) return fail("courses.errorNotEnrolled");

  await db.courseReview.upsert({
    where: { courseId_userId: { courseId, userId: me.id } },
    create: { courseId, userId: me.id, stars, comment: comment?.trim() || null },
    update: { stars, comment: comment?.trim() || null },
  });

  const aggregate = await db.courseReview.aggregate({
    where: { courseId },
    _avg: { stars: true },
    _count: { stars: true },
  });

  await db.onlineCourse.update({
    where: { id: courseId },
    data: { rating: aggregate._avg.stars ?? 0, ratingCount: aggregate._count.stars },
  });

  revalidatePath(`/kurset/${courseId}`);
  return succeed("courses.reviewed");
}
