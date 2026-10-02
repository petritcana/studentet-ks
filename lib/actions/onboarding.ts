"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, serializeList } from "@/lib/db";
import { requireAccount } from "@/lib/session";
import { getSuggestedPeople, type SuggestedPerson } from "@/lib/suggestions";
import { ACADEMIC_YEAR, INTEREST_KEYS, STUDY_LEVELS } from "@/lib/types";
import { fail, succeed, type ActionState } from "./types";

export async function saveUniversity(universityId: string): Promise<ActionState> {
  const me = await requireAccount();
  const university = await db.university.findUnique({ where: { id: universityId } });
  if (!university) return fail("onboarding.errorUniversity");

  await db.user.update({
    where: { id: me.id },
    data: { universityId, facultyId: null, departmentId: null },
  });
  return succeed();
}

export async function saveFaculty(
  facultyId: string,
  departmentId: string | null,
): Promise<ActionState> {
  const me = await requireAccount();
  const faculty = await db.faculty.findUnique({ where: { id: facultyId } });
  if (!faculty) return fail("onboarding.errorFaculty");

  await db.user.update({
    where: { id: me.id },
    data: { facultyId, departmentId, universityId: faculty.universityId },
  });
  return succeed();
}

export async function saveYear(year: number, level: string): Promise<ActionState> {
  const me = await requireAccount();
  const parsed = z
    .object({ year: z.number().int().min(1).max(4), level: z.enum(STUDY_LEVELS) })
    .safeParse({ year, level });
  if (!parsed.success) return fail("onboarding.errorYear");

  await db.user.update({
    where: { id: me.id },
    data: { year: parsed.data.year, level: parsed.data.level },
  });
  return succeed();
}

/**
 * Hapi që ndërton krejt grafin. Çdo lëndë e zgjedhur e fut studentin edhe në
 * kanalin e asaj lënde, kështu që asnjë kanal nuk mbetet bosh.
 */
export async function saveCourses(courseIds: string[]): Promise<ActionState> {
  const me = await requireAccount();
  const unique = [...new Set(courseIds)].slice(0, 14);
  if (unique.length === 0) return fail("onboarding.errorCourses");

  const courses = await db.course.findMany({ where: { id: { in: unique } }, select: { id: true } });

  await db.enrollment.deleteMany({ where: { userId: me.id, academicYear: ACADEMIC_YEAR } });
  await db.enrollment.createMany({
    data: courses.map((course) => ({
      userId: me.id,
      courseId: course.id,
      academicYear: ACADEMIC_YEAR,
    })),
  });

  for (const course of courses) {
    const group = await db.group.findFirst({
      where: { courseId: course.id, type: "course" },
      select: { id: true },
    });
    if (group) {
      await db.groupMember.upsert({
        where: { groupId_userId: { groupId: group.id, userId: me.id } },
        create: { groupId: group.id, userId: me.id },
        update: {},
      });
    }
  }

  return succeed();
}

export async function saveInterests(interests: string[]): Promise<ActionState> {
  const me = await requireAccount();
  const valid = interests.filter((item) => (INTEREST_KEYS as readonly string[]).includes(item));
  await db.user.update({ where: { id: me.id }, data: { interests: serializeList(valid) } });
  return succeed();
}

/**
 * Profili i hyrjes: bio, qyteti dhe shkolla e mesme.
 *
 * Emri nuk shkruhet këtu. Ai vjen nga llogaria me të cilën studenti u regjistrua
 * dhe te ky hap shfaqet vetëm për lexim, që askush të mos hyjë me një emër dhe
 * të dalë me një tjetër brenda të njëjtit minut.
 */
export async function saveProfile(input: {
  bio?: string;
  city?: string;
  highSchool?: string;
}): Promise<ActionState> {
  const me = await requireAccount();
  const parsed = z
    .object({
      bio: z.string().trim().max(160).optional(),
      city: z.string().trim().max(60).optional(),
      highSchool: z.string().trim().max(120).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return fail("onboarding.errorSave");

  await db.user.update({
    where: { id: me.id },
    data: {
      bio: parsed.data.bio || null,
      city: parsed.data.city || null,
      highSchool: parsed.data.highSchool || null,
    },
  });
  revalidatePath("/une");
  return succeed();
}

export async function fetchSuggestions(locale: string, limit = 12): Promise<SuggestedPerson[]> {
  const me = await requireAccount();
  return getSuggestedPeople(me.id, limit, { locale });
}

/**
 * Mbyllja e hyrjes.
 *
 * Nuk kërkon as lëndë as ndjekje: llogaria hapet, dhe njerëzit vijnë në hapin
 * pasues, kur studenti tashmë e ka një profil për t'u treguar. Të kërkoje tri
 * ndjekje para se të hapej llogaria ishte pengesë para vlerës, jo pas saj.
 */
export async function finishOnboarding(): Promise<ActionState> {
  const me = await requireAccount();

  await db.user.update({ where: { id: me.id }, data: { onboardedAt: new Date() } });

  revalidatePath("/feed");
  revalidatePath("/une");
  return succeed();
}
