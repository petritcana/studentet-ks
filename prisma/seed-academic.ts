// Mbjell katalogun akademik: institucionet, degët, fakultetet, programet dhe
// drejtimet, nga lista zyrtare e programeve të akredituara.
//
// I sigurt të lëshohet sa herë të duash: çdo zë gjendet nga slug-u i vet dhe
// përditësohet, kurrë nuk dyfishohet. Programet që dikur ishin në listë dhe sot
// nuk janë, nuk fshihen: shënohen si joaktive, që studentët që i kanë studiuar
// të mos mbeten me një profil pa program.
import { domainsForInstitution } from "../lib/student-domains";
import { PrismaClient } from "@prisma/client";
import { ACADEMIC_YEAR, CATALOG_SOURCE, CATALOG_VERIFIED_AT, INSTITUTIONS } from "./academic/catalog";
import { ORIENTATIONS } from "./academic/orientations";
import type { ProgramSeed } from "./academic/types";

const db = new PrismaClient();

/** Çelësi i kërkimit: pa theks, me shkronja të vogla, që «financa» të gjejë «Financa». */
function searchKey(...values: string[]): string {
  return values
    .join(" ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ë/g, "e")
    .replace(/ç/g, "c")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function main() {
  const verifiedAt = new Date(CATALOG_VERIFIED_AT);
  let programCount = 0;
  const seenPrograms = new Set<string>();

  for (const institution of INSTITUTIONS) {
    const university = await db.university.upsert({
      where: { slug: institution.slug },
      update: {
        name: institution.name,
        nameEn: institution.nameEn,
        abbr: institution.abbr,
        city: institution.city,
        type: institution.type,
        website: institution.website,
        emailDomain: domainsForInstitution(institution.slug)[0] ?? null,
        active: true,
      },
      create: {
        slug: institution.slug,
        name: institution.name,
        nameEn: institution.nameEn,
        abbr: institution.abbr,
        city: institution.city,
        type: institution.type,
        website: institution.website,
        emailDomain: domainsForInstitution(institution.slug)[0] ?? null,
      },
    });

    // Domenet studentore vijnë nga lista e hulumtuar, jo nga katalogu: ajo dallon
    // studentin nga stafi dhe mban burimin për secilin.
    const domains = domainsForInstitution(institution.slug);
    await db.universityEmailDomain.deleteMany({
      where: { universityId: university.id, domain: { notIn: domains } },
    });
    for (const domain of domains) {
      await db.universityEmailDomain.upsert({
        where: { domain },
        update: { universityId: university.id },
        create: { universityId: university.id, domain },
      });
    }

    const campusIds = new Map<string, string>();
    for (const campus of institution.campuses ?? []) {
      const created = await db.campus.upsert({
        where: { universityId_slug: { universityId: university.id, slug: campus.slug } },
        update: { name: campus.name, nameEn: campus.nameEn, city: campus.city, active: true },
        create: {
          universityId: university.id,
          slug: campus.slug,
          name: campus.name,
          nameEn: campus.nameEn,
          city: campus.city,
        },
      });
      campusIds.set(campus.name, created.id);
    }

    const facultyIds = new Map<string, string>();
    for (const faculty of institution.faculties ?? []) {
      const existing = await db.faculty.findFirst({
        where: { universityId: university.id, OR: [{ slug: faculty.slug }, { abbr: faculty.abbr }] },
        select: { id: true },
      });

      const data = {
        name: faculty.name,
        nameEn: faculty.nameEn,
        abbr: faculty.abbr,
        slug: faculty.slug,
        color: faculty.color,
        icon: faculty.icon,
      };

      const created = existing
        ? await db.faculty.update({ where: { id: existing.id }, data })
        : await db.faculty.create({ data: { ...data, universityId: university.id } });

      facultyIds.set(faculty.slug, created.id);
    }

    for (const program of institution.programs as (ProgramSeed & { accreditationUntil?: string })[]) {
      const campusName = program.campuses?.[0];
      const campusId = campusName ? (campusIds.get(campusName) ?? null) : null;
      const facultyId = program.faculty ? (facultyIds.get(program.faculty) ?? null) : null;

      const existing = await db.studyProgram.findFirst({
        where: {
          universityId: university.id,
          slug: program.slug,
          degreeLevel: program.level,
          campusId,
        },
        select: { id: true },
      });

      const data = {
        name: program.name,
        nameEn: program.nameEn,
        searchKey: searchKey(program.name, program.nameEn),
        degreeLevel: program.level,
        // Shkurtesa që shfaqet nën emrin e programit: BSc, BA, LLB, MSc, PhD.
        degreeTitle: program.degreeTitle ?? null,
        ects: program.ects ?? null,
        campusId,
        facultyId,
        academicYear: ACADEMIC_YEAR,
        accreditation: "accredited",
        accreditationUntil: parseDate(program.accreditationUntil),
        sourceType: "kaa",
        sourceRef: CATALOG_SOURCE,
        lastVerifiedAt: verifiedAt,
        active: true,
      };

      const saved = existing
        ? await db.studyProgram.update({ where: { id: existing.id }, data })
        : await db.studyProgram.create({
            data: { ...data, universityId: university.id, slug: program.slug },
          });

      seenPrograms.add(saved.id);
      programCount += 1;

      for (const specialization of program.specializations ?? []) {
        await db.specialization.upsert({
          where: { studyProgramId_slug: { studyProgramId: saved.id, slug: specialization.slug } },
          update: { name: specialization.name, nameEn: specialization.nameEn, active: true },
          create: {
            studyProgramId: saved.id,
            slug: specialization.slug,
            name: specialization.name,
            nameEn: specialization.nameEn,
          },
        });
      }
    }
  }

  /*
    Drejtimet nga faqet zyrtare.

    Lista e AKA-së thotë vetëm sa janë; emrat i publikon institucioni. Drejtimi
    i njëjtë vlen për të gjitha degët e po atij programi, prandaj shtohet te secila.
  */
  let orientationCount = 0;
  for (const entry of ORIENTATIONS) {
    const programs = await db.studyProgram.findMany({
      where: {
        university: { slug: entry.institution },
        slug: entry.program,
        degreeLevel: entry.level,
        active: true,
      },
      select: { id: true },
    });

    if (programs.length === 0) {
      console.warn(`seed-academic: s'u gjet programi ${entry.institution}/${entry.program} për drejtimet.`);
      continue;
    }

    for (const program of programs) {
      for (const item of entry.items) {
        await db.specialization.upsert({
          where: { studyProgramId_slug: { studyProgramId: program.id, slug: item.slug } },
          update: { name: item.name, nameEn: item.nameEn, active: true },
          create: {
            studyProgramId: program.id,
            slug: item.slug,
            name: item.name,
            nameEn: item.nameEn,
          },
        });
        orientationCount += 1;
      }
    }
  }

  // Programet e vjetra nuk fshihen: dalin nga zgjedhja, por mbeten për historikun.
  const retired = await db.studyProgram.updateMany({
    where: { id: { notIn: [...seenPrograms] }, active: true },
    data: { active: false, accreditation: "expired" },
  });

  const institutions = await db.university.count();
  const campuses = await db.campus.count();
  const programs = await db.studyProgram.count({ where: { active: true } });
  const specializations = await db.specialization.count();

  console.log(
    `seed-academic: ${institutions} institucione, ${campuses} degë, ${programs} programe aktive ` +
      `(${programCount} nga lista), ${specializations} drejtime (${orientationCount} nga faqet zyrtare), ` +
      `${retired.count} programe të arkivuara.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
