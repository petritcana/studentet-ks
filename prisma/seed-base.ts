// Të dhënat bazë për prodhim: universitetet, fakultetet, lëndët, planet dhe badge-t.
//
// Pa përdorues demo, pa postime, pa fjalëkalime të përbashkëta. Regjistrimi ka nevojë
// për fakultetet dhe lëndët, faqja PRO për planet. Nëse universitetet ekzistojnë,
// skripti nuk bën asgjë, prandaj mund të thirret sa herë të duash.
import { PrismaClient } from "@prisma/client";
import {
  BADGES,
  COURSES,
  OTHER_FACULTIES,
  PLANS,
  UNIVERSITIES,
  UP_FACULTIES,
} from "./seed-data";

const db = new PrismaClient();

async function main() {
  if ((await db.university.count()) > 0) {
    console.log("seed-base: të dhënat bazë ekzistojnë, s'ka çfarë të shtohet.");
    return;
  }

  const universities = new Map<string, string>();
  for (const university of UNIVERSITIES) {
    const created = await db.university.create({ data: { ...university } });
    universities.set(university.abbr, created.id);
  }

  const faculties = new Map<string, string>();
  for (const faculty of UP_FACULTIES) {
    const created = await db.faculty.create({
      data: { ...faculty, universityId: universities.get("UP")! },
    });
    faculties.set(faculty.abbr, created.id);
  }
  for (const faculty of OTHER_FACULTIES) {
    const { university, ...rest } = faculty;
    const created = await db.faculty.create({
      data: { ...rest, universityId: universities.get(university)! },
    });
    faculties.set(faculty.abbr, created.id);
  }

  const departments = new Map<string, string>();
  for (const course of COURSES) {
    const key = `${course.faculty}:${course.department}`;
    if (!departments.has(key)) {
      const department = await db.department.create({
        data: {
          facultyId: faculties.get(course.faculty)!,
          name: course.department,
          nameEn: course.departmentEn,
        },
      });
      departments.set(key, department.id);
    }

    await db.course.create({
      data: {
        departmentId: departments.get(key)!,
        name: course.name,
        nameEn: course.nameEn,
        code: course.code,
        year: course.year,
        semester: course.semester,
        ects: course.ects,
        professor: course.professor,
      },
    });
  }

  for (const plan of PLANS) await db.plan.create({ data: plan });
  for (const badge of BADGES) await db.badge.create({ data: badge });

  console.log(
    `seed-base: ${universities.size} universitete, ${faculties.size} fakultete, ` +
      `${COURSES.length} lëndë, ${PLANS.length} plane, ${BADGES.length} badge.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
