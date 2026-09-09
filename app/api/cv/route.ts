import { db, parseList } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { buildPdf, type PdfLine } from "@/lib/pdf";
import { STUDY_LEVEL_LABELS, YEAR_LABELS, type StudyLevel } from "@/lib/constants";
import { levelFor } from "@/lib/xp";

/**
 * CV me një klikim. Profili është tashmë një CV: universiteti, viti, lëndët,
 * badge-t dhe kontributet. Kjo rrugë vetëm e nxjerr në PDF.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Duhet të jesh i kyçur.", { status: 401 });

  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      username: true,
      email: true,
      bio: true,
      city: true,
      year: true,
      level: true,
      xp: true,
      interests: true,
      highSchool: true,
      createdAt: true,
      university: { select: { name: true } },
      faculty: { select: { name: true } },
      department: { select: { name: true } },
      enrollments: {
        select: { course: { select: { name: true, code: true, ects: true, year: true } } },
        orderBy: { course: { year: "asc" } },
      },
      badges: {
        select: { context: true, badge: { select: { name: true, description: true } } },
        orderBy: { earnedAt: "desc" },
      },
      materials: {
        where: { isHidden: false },
        select: { title: true, downloads: true, course: { select: { name: true } } },
        orderBy: { downloads: "desc" },
        take: 8,
      },
      _count: { select: { materials: true, answers: true, posts: true } },
    },
  });

  if (!profile) return new Response("Profili nuk u gjet.", { status: 404 });

  const accepted = await db.answer.count({
    where: { authorId: user.id, question: { acceptedAnswerId: { not: null } } },
  });

  const level = levelFor(profile.xp);
  const interests = parseList(profile.interests);

  const lines: PdfLine[] = [
    { text: profile.name, size: 24, bold: true, gap: 4 },
    {
      text: [
        profile.faculty?.name,
        profile.year ? YEAR_LABELS[profile.year] : null,
        profile.level ? STUDY_LEVEL_LABELS[profile.level as StudyLevel] : null,
      ]
        .filter(Boolean)
        .join(" · "),
      size: 12,
      color: [0.31, 0.27, 0.9],
      gap: 4,
    },
    {
      text: [profile.university?.name, profile.city].filter(Boolean).join(" · "),
      size: 10,
      color: [0.47, 0.44, 0.42],
      gap: 4,
    },
    {
      text: `${profile.email} · studentet.ks/u/${profile.username}`,
      size: 10,
      color: [0.47, 0.44, 0.42],
      gap: 16,
    },
  ];

  if (profile.bio) {
    lines.push({ text: "Profili", size: 13, bold: true, gap: 6 });
    lines.push({ text: profile.bio, gap: 16 });
  }

  lines.push({ text: "Arsimimi", size: 13, bold: true, gap: 6 });
  lines.push({
    text: `${profile.university?.name ?? "Universiteti"} — ${profile.faculty?.name ?? ""}`,
    gap: 2,
  });
  if (profile.department) lines.push({ text: profile.department.name, gap: 2 });
  if (profile.highSchool) lines.push({ text: `Shkolla e mesme: ${profile.highSchool}`, gap: 16 });
  else lines.push({ text: "", gap: 12 });

  if (profile.enrollments.length > 0) {
    lines.push({ text: "Lëndët e ndjekura", size: 13, bold: true, gap: 6 });
    for (const item of profile.enrollments) {
      lines.push({
        text: `${item.course.name} (${item.course.code}) — ${item.course.ects} ECTS`,
        size: 10,
        gap: 1,
      });
    }
    lines.push({ text: "", gap: 12 });
  }

  lines.push({ text: "Kontributi në komunitet", size: 13, bold: true, gap: 6 });
  lines.push({ text: `Materiale të ngarkuara: ${profile._count.materials}`, gap: 2 });
  lines.push({ text: `Përgjigje të pranuara: ${accepted}`, gap: 2 });
  lines.push({ text: `Postime: ${profile._count.posts}`, gap: 2 });
  lines.push({ text: `Niveli: ${level.name} (${profile.xp} XP)`, gap: 16 });

  if (profile.materials.length > 0) {
    lines.push({ text: "Materialet më të shkarkuara", size: 13, bold: true, gap: 6 });
    for (const material of profile.materials) {
      lines.push({
        text: `${material.title} — ${material.course.name} (${material.downloads} shkarkime)`,
        size: 10,
        gap: 1,
      });
    }
    lines.push({ text: "", gap: 12 });
  }

  if (profile.badges.length > 0) {
    lines.push({ text: "Njohje", size: 13, bold: true, gap: 6 });
    for (const item of profile.badges) {
      lines.push({
        text: `${item.badge.name}${item.context ? `: ${item.context}` : ""} — ${item.badge.description}`,
        size: 10,
        gap: 1,
      });
    }
    lines.push({ text: "", gap: 12 });
  }

  if (interests.length > 0) {
    lines.push({ text: "Interesa", size: 13, bold: true, gap: 6 });
    lines.push({ text: interests.join(", "), gap: 16 });
  }

  lines.push({
    text: `Gjeneruar nga Studentet.KS me ${new Date().toLocaleDateString("sq-AL")}.`,
    size: 9,
    color: [0.47, 0.44, 0.42],
  });

  const pdf = buildPdf(`CV ${profile.name}`, lines);

  return new Response(pdf as BodyInit, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="cv-${profile.username}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
