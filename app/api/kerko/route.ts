import { NextResponse } from "next/server";
import { getLocale } from "next-intl/server";
import { canViewMaterial } from "@/lib/access";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ groups: [] }, { status: 401 });

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ groups: [] });

  const locale = await getLocale();
  const english = locale === "en";
  const contains = { contains: query } as const;

  const [people, materials, courses, questions, events, jobs] = await Promise.all([
    db.user.findMany({
      where: {
        // Kërkohet me emër, mbiemër ose emër përdoruesi: «petrit», «cana» dhe
        // «petrit.cana» duhet ta gjejnë të njëjtin person.
        OR: [
          { name: contains },
          { username: contains },
          { firstName: contains },
          { lastName: contains },
        ],
        NOT: { id: me.id },
      },
      take: 4,
      select: {
        id: true,
        name: true,
        username: true,
        isVerified: true,
        year: true,
        faculty: { select: { name: true, nameEn: true } },
      },
    }),
    db.material.findMany({
      where: { title: contains, isHidden: false },
      take: 5,
      select: {
        id: true,
        title: true,
        type: true,
        uploaderId: true,
        isHidden: true,
        courseId: true,
        course: {
          select: {
            name: true,
            nameEn: true,
            department: {
              select: {
                facultyId: true,
                faculty: { select: { universityId: true, name: true, nameEn: true } },
              },
            },
          },
        },
      },
    }),
    db.course.findMany({
      where: { OR: [{ name: contains }, { nameEn: contains }, { code: contains }] },
      take: 4,
      select: {
        id: true,
        name: true,
        nameEn: true,
        code: true,
        department: { select: { faculty: { select: { name: true, nameEn: true } } } },
      },
    }),
    db.question.findMany({
      where: { title: contains, isHidden: false },
      take: 4,
      select: {
        id: true,
        title: true,
        course: { select: { name: true, nameEn: true } },
        _count: { select: { answers: true } },
      },
    }),
    db.event.findMany({
      where: { title: contains },
      take: 3,
      select: { id: true, title: true, location: true, date: true },
    }),
    db.jobPost.findMany({
      where: { title: contains, deadline: { gte: new Date() } },
      take: 3,
      select: { id: true, title: true, city: true, company: { select: { name: true } } },
    }),
  ]);

  const groups = [
    {
      key: "people",
      items: people.map((person) => ({
        id: person.id,
        title: person.name,
        subtitle: [
          `@${person.username}`,
          english ? person.faculty?.nameEn : person.faculty?.name,
        ]
          .filter(Boolean)
          .join(" · "),
        href: `/u/${person.username}`,
        verified: person.isVerified,
      })),
    },
    {
      key: "materials",
      items: materials.map((material) => ({
        id: material.id,
        title: material.title,
        subtitle: english ? material.course.nameEn : material.course.name,
        href: `/materialet/${material.id}`,
        locked: !canViewMaterial(me.access, material).allowed,
      })),
    },
    {
      key: "courses",
      items: courses.map((course) => ({
        id: course.id,
        title: english ? course.nameEn : course.name,
        subtitle: [course.code, english ? course.department.faculty.nameEn : course.department.faculty.name]
          .filter(Boolean)
          .join(" · "),
        href: `/lenda/${course.id}`,
      })),
    },
    {
      key: "questions",
      items: questions.map((question) => ({
        id: question.id,
        title: question.title,
        subtitle: english ? question.course.nameEn : question.course.name,
        href: `/pyetje/${question.id}`,
      })),
    },
    {
      key: "events",
      items: events.map((event) => ({
        id: event.id,
        title: event.title,
        subtitle: event.location,
        href: `/eventet/${event.id}`,
      })),
    },
    {
      key: "jobs",
      items: jobs.map((job) => ({
        id: job.id,
        title: job.title,
        subtitle: `${job.company.name} · ${job.city}`,
        href: `/karriera/${job.id}`,
      })),
    },
  ].filter((group) => group.items.length > 0);

  return NextResponse.json({ groups });
}
