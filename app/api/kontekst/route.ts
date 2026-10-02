import { NextResponse } from "next/server";
import { getLocale } from "next-intl/server";
import { canViewMaterial } from "@/lib/access";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * Titulli i kontekstit për asistentin.
 *
 * Doku e di se ku ndodhet studenti nga rruga, por një id nuk lexohet. Kjo rrugë
 * e kthen emrin e vërtetë, dhe respekton rrethet: një material jashtë rrethit
 * kthen titullin, sepse ai duket gjithsesi te faqja, por shënohet `locked`.
 */
export async function GET(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ title: null }, { status: 401 });

  const url = new URL(request.url);
  const kind = url.searchParams.get("lloji");
  const id = url.searchParams.get("id");
  if (!kind || !id) return NextResponse.json({ title: null });

  const locale = await getLocale();
  const english = locale === "en";

  if (kind === "material") {
    const material = await db.material.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        isHidden: true,
        uploaderId: true,
        courseId: true,
        course: {
          select: {
            department: {
              select: { facultyId: true, faculty: { select: { universityId: true } } },
            },
          },
        },
      },
    });
    if (!material) return NextResponse.json({ title: null });

    return NextResponse.json({
      title: material.title,
      locked: !canViewMaterial(me.access, material).allowed,
    });
  }

  if (kind === "course") {
    const course = await db.course.findUnique({
      where: { id },
      select: { name: true, nameEn: true },
    });
    return NextResponse.json({ title: course ? (english ? course.nameEn : course.name) : null });
  }

  if (kind === "job") {
    const job = await db.jobPost.findUnique({ where: { id }, select: { title: true } });
    return NextResponse.json({ title: job?.title ?? null });
  }

  return NextResponse.json({ title: null });
}
