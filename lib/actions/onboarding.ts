"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, serializeList } from "@/lib/db";
import { requireAccount } from "@/lib/session";
import { getSuggestedPeople, type SuggestedPerson } from "@/lib/suggestions";
import { INTERESTS, STUDY_LEVELS } from "@/lib/constants";
import { fail, succeed, type ActionState } from "./types";

const ACADEMIC_YEAR = "2025/26";

export async function saveUniversity(universityId: string): Promise<ActionState> {
  const me = await requireAccount();
  const university = await db.university.findUnique({ where: { id: universityId } });
  if (!university) return fail("Ky universitet nuk u gjet.");

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
  if (!faculty) return fail("Ky fakultet nuk u gjet.");

  await db.user.update({
    where: { id: me.id },
    data: { facultyId, departmentId, universityId: faculty.universityId },
  });
  return succeed();
}

const yearSchema = z.object({
  year: z.number().int().min(1).max(4),
  level: z.enum(STUDY_LEVELS),
});

export async function saveYear(year: number, level: string): Promise<ActionState> {
  const me = await requireAccount();
  const parsed = yearSchema.safeParse({ year, level });
  if (!parsed.success) return fail("Zgjidh vitin dhe nivelin.");

  await db.user.update({
    where: { id: me.id },
    data: { year: parsed.data.year, level: parsed.data.level },
  });
  return succeed();
}

/**
 * Hapi që e ndërton krejt grafin. Çdo lëndë e zgjedhur e fut studentin edhe në
 * kanalin e asaj lënde, kështu që asnjë kanal nuk mbetet bosh.
 */
export async function saveCourses(courseIds: string[]): Promise<ActionState> {
  const me = await requireAccount();
  const unique = [...new Set(courseIds)].slice(0, 12);
  if (unique.length === 0) return fail("Zgjidh të paktën një lëndë.");

  const courses = await db.course.findMany({
    where: { id: { in: unique } },
    select: { id: true },
  });

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

  const user = await db.user.findUnique({
    where: { id: me.id },
    select: { facultyId: true, year: true },
  });
  if (user?.facultyId && user.year) {
    const faculty = await db.faculty.findUnique({
      where: { id: user.facultyId },
      select: { name: true },
    });
    const label = `${faculty?.name.replace("Fakulteti i ", "").replace("Fakulteti ", "")}, viti ${["I", "II", "III", "IV"][user.year - 1]}`;
    const generationGroup = await db.group.findFirst({
      where: { type: "generation", name: label },
      select: { id: true },
    });
    if (generationGroup) {
      await db.groupMember.upsert({
        where: { groupId_userId: { groupId: generationGroup.id, userId: me.id } },
        create: { groupId: generationGroup.id, userId: me.id },
        update: {},
      });
    }
  }

  return succeed();
}

export async function saveInterests(interests: string[]): Promise<ActionState> {
  const me = await requireAccount();
  const valid = interests.filter((item) =>
    (INTERESTS as readonly string[]).includes(item),
  );
  await db.user.update({
    where: { id: me.id },
    data: { interests: serializeList(valid) },
  });
  return succeed();
}

const profileSchema = z.object({
  name: z.string().trim().min(3, "Shkruaj emrin dhe mbiemrin.").max(60),
  bio: z.string().trim().max(160, "Bio-ja duhet të jetë nën 160 shkronja.").optional(),
  city: z.string().trim().max(40).optional(),
  highSchool: z.string().trim().max(120).optional(),
});

export async function saveProfile(input: {
  name: string;
  bio?: string;
  city?: string;
  highSchool?: string;
}): Promise<ActionState> {
  const me = await requireAccount();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0] ?? "form")] = issue.message;
    }
    return fail("Rregullo fushat e shënuara.", fieldErrors);
  }

  await db.user.update({
    where: { id: me.id },
    data: {
      name: parsed.data.name,
      bio: parsed.data.bio || null,
      city: parsed.data.city || null,
      highSchool: parsed.data.highSchool || null,
    },
  });
  revalidatePath("/une");
  return succeed();
}

export async function fetchSuggestions(limit = 12): Promise<SuggestedPerson[]> {
  const me = await requireAccount();
  return getSuggestedPeople(me.id, limit);
}

/** Fitorja e menjëhershme: çfarë e pret studentin sapo të mbarojë. */
export type OnboardingWin = {
  courseCount: number;
  nextClass: { course: string; day: string; time: string; room: string } | null;
  materialCount: number;
  openQuestionCount: number;
  followingCount: number;
};

export async function finishOnboarding(): Promise<
  ActionState & { win?: OnboardingWin }
> {
  const me = await requireAccount();

  const followingCount = await db.follow.count({ where: { followerId: me.id } });
  if (followingCount < 5) {
    return fail("Ndiq të paktën 5 veta para se të vazhdosh.");
  }

  const enrollments = await db.enrollment.findMany({
    where: { userId: me.id },
    select: { courseId: true },
  });
  const courseIds = enrollments.map((item) => item.courseId);
  if (courseIds.length === 0) {
    return fail("Zgjidh lëndët e këtij semestri para se të vazhdosh.");
  }

  await db.user.update({
    where: { id: me.id },
    data: { onboardedAt: new Date() },
  });

  const [materialCount, openQuestionCount, slots] = await Promise.all([
    db.material.count({
      where: { courseId: { in: courseIds }, isHidden: false },
    }),
    db.question.count({
      where: { courseId: { in: courseIds }, acceptedAnswerId: null, isHidden: false },
    }),
    db.scheduleSlot.findMany({
      where: { courseId: { in: courseIds } },
      include: { course: { select: { name: true } } },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
  ]);

  const DAY_NAMES = ["", "të hënën", "të martën", "të mërkurën", "të enjten", "të premten", "të shtunën", "të dielën"];
  const today = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const upcoming =
    slots.find((slot) => slot.dayOfWeek >= today) ?? slots[0] ?? null;

  revalidatePath("/feed");

  return {
    ...succeed(),
    win: {
      courseCount: courseIds.length,
      nextClass: upcoming
        ? {
            course: upcoming.course.name,
            day: DAY_NAMES[upcoming.dayOfWeek],
            time: upcoming.startTime,
            room: upcoming.room,
          }
        : null,
      materialCount,
      openQuestionCount,
      followingCount,
    },
  };
}
