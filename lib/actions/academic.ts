"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { institutionForEmail } from "@/lib/registration";
import { requireAccount, requireUser } from "@/lib/session";
import { yearsForProgram } from "@/lib/queries/academic";
import { fail, succeed, type ActionState } from "./types";

/**
 * Rruga akademike e studentit.
 *
 * Programi vendos gjithçka tjetër: prej tij merren institucioni, dega dhe
 * fakulteti, që një kombinim i pamundur të mos hyjë kurrë në bazë, sado që
 * klienti të dërgojë. Heqja e lidhjes nuk e prek llogarinë.
 */
const academicSchema = z.object({
  studyProgramId: z.string().min(1),
  specializationId: z.string().nullable().optional(),
  year: z.number().int().min(1).max(8),
  cohortYear: z.number().int().min(1990).max(2100).nullable().optional(),
});

export type AcademicInput = z.input<typeof academicSchema>;

export async function saveAcademicProfile(input: AcademicInput): Promise<ActionState> {
  // `requireAccount`, jo `requireUser`: ky veprim thirret edhe gjatë hyrjes, kur
  // llogaria ende nuk është mbyllur, dhe një ridrejtim këtu do ta priste hapin.
  const me = await requireAccount();

  const parsed = academicSchema.safeParse(input);
  if (!parsed.success) return fail("academic.chooseProgram");
  const data = parsed.data;

  const program = await db.studyProgram.findUnique({
    where: { id: data.studyProgramId },
    select: {
      id: true,
      universityId: true,
      campusId: true,
      facultyId: true,
      departmentId: true,
      degreeLevel: true,
      ects: true,
      active: true,
    },
  });
  if (!program) return fail("errors.notFoundContent");

  // Emaili studentor e cakton institucionin: programi duhet të jetë aty.
  const institution = await institutionForEmail(me.studentEmail);
  if (institution && program.universityId !== institution.id) return fail("academic.wrongInstitution");

  // Viti i studimit nuk del jashtë kohëzgjatjes së programit.
  const maxYear = yearsForProgram(program.degreeLevel, program.ects);
  const year = Math.min(data.year, maxYear);

  // Drejtimi duhet t'i përkasë pikërisht këtij programi.
  let specializationId: string | null = null;
  if (data.specializationId) {
    const specialization = await db.specialization.findFirst({
      where: { id: data.specializationId, studyProgramId: program.id, active: true },
      select: { id: true },
    });
    specializationId = specialization?.id ?? null;
  }

  await db.user.update({
    where: { id: me.id },
    data: {
      universityId: program.universityId,
      campusId: program.campusId,
      facultyId: program.facultyId,
      departmentId: program.departmentId,
      studyProgramId: program.id,
      specializationId,
      level: program.degreeLevel,
      year,
      cohortYear: data.cohortYear ?? null,
    },
  });

  revalidatePath("/une");
  revalidatePath("/cilesimet");
  revalidatePath("/feed");
  return succeed("academic.saved");
}

/** Heq lidhjen akademike pa prekur llogarinë, emrin e përdoruesit dhe përmbajtjen. */
export async function removeAcademicProfile(): Promise<ActionState> {
  const me = await requireUser();

  await db.user.update({
    where: { id: me.id },
    data: {
      universityId: null,
      campusId: null,
      facultyId: null,
      departmentId: null,
      studyProgramId: null,
      specializationId: null,
      year: null,
      cohortYear: null,
    },
  });

  revalidatePath("/une");
  revalidatePath("/cilesimet");
  return succeed("academic.removed");
}

/** Arsimimi i mëparshëm: shkolla e mesme, ose institucioni i diplomës së fundit. */
const previousSchema = z.object({
  institution: z.string().trim().max(120),
  city: z.string().trim().max(60),
});

export async function savePreviousEducation(input: z.input<typeof previousSchema>): Promise<ActionState> {
  const me = await requireUser();

  const parsed = previousSchema.safeParse(input);
  if (!parsed.success) return fail("errors.generic");

  await db.user.update({
    where: { id: me.id },
    data: {
      highSchool: parsed.data.institution || null,
      previousCity: parsed.data.city || null,
    },
  });

  revalidatePath("/une");
  revalidatePath("/cilesimet");
  return succeed("academic.saved");
}
