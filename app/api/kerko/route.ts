import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * Kërkimi global: një shirit që kërkon njëkohësisht njerëz, lëndë, materiale,
 * postime, evente dhe punë. Kthen vetëm fusha publike.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Duhet të jesh i kyçur." }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ groups: [] });
  }

  const like = { contains: query };

  const [people, courses, materials, posts, events, jobs] = await Promise.all([
    db.user.findMany({
      where: {
        onboardedAt: { not: null },
        OR: [{ name: like }, { username: like }],
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        isVerified: true,
        year: true,
        faculty: { select: { name: true, color: true } },
      },
      take: 5,
    }),
    db.course.findMany({
      where: { OR: [{ name: like }, { code: like }, { professor: like }] },
      select: {
        id: true,
        name: true,
        code: true,
        year: true,
        department: { select: { faculty: { select: { color: true, name: true } } } },
      },
      take: 5,
    }),
    db.material.findMany({
      where: { isHidden: false, OR: [{ title: like }, { professor: like }] },
      select: {
        id: true,
        title: true,
        type: true,
        rating: true,
        course: { select: { name: true } },
      },
      take: 5,
    }),
    db.post.findMany({
      where: { isHidden: false, text: like },
      select: {
        id: true,
        text: true,
        type: true,
        isAnonymous: true,
        pseudonym: true,
        createdAt: true,
        author: { select: { name: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.event.findMany({
      where: { OR: [{ title: like }, { location: like }] },
      select: { id: true, title: true, date: true, location: true, kind: true },
      orderBy: { date: "asc" },
      take: 4,
    }),
    db.jobPost.findMany({
      where: { OR: [{ title: like }, { field: like }] },
      select: {
        id: true,
        title: true,
        type: true,
        city: true,
        company: { select: { name: true } },
      },
      take: 4,
    }),
  ]);

  const groups = [
    {
      key: "people",
      label: "Njerëz",
      items: people.map((person) => ({
        id: person.id,
        title: person.name,
        subtitle: [person.faculty?.name?.replace("Fakulteti i ", "").replace("Fakulteti ", ""), person.year ? `viti ${person.year}` : null]
          .filter(Boolean)
          .join(", "),
        href: `/u/${person.username}`,
        color: person.faculty?.color ?? null,
        verified: person.isVerified,
      })),
    },
    {
      key: "courses",
      label: "Lëndë",
      items: courses.map((course) => ({
        id: course.id,
        title: course.name,
        subtitle: `${course.code} · viti ${course.year}`,
        href: `/lenda/${course.id}`,
        color: course.department.faculty.color,
      })),
    },
    {
      key: "materials",
      label: "Materiale",
      items: materials.map((material) => ({
        id: material.id,
        title: material.title,
        subtitle: material.course.name,
        href: `/materialet/${material.id}`,
        color: null,
      })),
    },
    {
      key: "posts",
      label: "Postime",
      items: posts.map((post) => ({
        id: post.id,
        title: post.text.slice(0, 80),
        subtitle: post.isAnonymous
          ? (post.pseudonym ?? "Studenti anonim")
          : post.author.name,
        href: `/postimi/${post.id}`,
        color: null,
      })),
    },
    {
      key: "events",
      label: "Evente",
      items: events.map((event) => ({
        id: event.id,
        title: event.title,
        subtitle: event.location,
        href: `/eventet/${event.id}`,
        color: null,
      })),
    },
    {
      key: "jobs",
      label: "Punë dhe praktika",
      items: jobs.map((job) => ({
        id: job.id,
        title: job.title,
        subtitle: `${job.company.name} · ${job.city}`,
        href: `/pune/${job.id}`,
        color: null,
      })),
    },
  ].filter((group) => group.items.length > 0);

  return NextResponse.json({ groups });
}
