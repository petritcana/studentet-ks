import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { buildPdf, type PdfLine } from "@/lib/pdf";
import { MATERIAL_TYPE_LABELS, type MaterialType } from "@/lib/constants";

/**
 * Shkarkimi. Në prodhim këtu do të rrjedhë skedari real nga ruajtja e objekteve.
 * Në demo gjenerohet një PDF i vërtetë me metadatat e materialit, që rrjedha e
 * shkarkimit të testohet nga fillimi në fund pa skedarë të rremë në repo.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return new Response("Duhet të jesh i kyçur.", { status: 401 });

  const { id } = await params;
  const material = await db.material.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      type: true,
      pages: true,
      academicYear: true,
      professor: true,
      description: true,
      isHidden: true,
      rating: true,
      ratingCount: true,
      downloads: true,
      verificationStatus: true,
      course: {
        select: {
          name: true,
          code: true,
          department: { select: { name: true, faculty: { select: { name: true } } } },
        },
      },
      uploader: { select: { name: true, username: true } },
    },
  });

  if (!material || material.isHidden) {
    return new Response("Ky material nuk është i disponueshëm.", { status: 404 });
  }

  await db.material.update({
    where: { id },
    data: { downloads: { increment: 1 } },
  });

  const lines: PdfLine[] = [
    { text: material.title, size: 20, bold: true, gap: 10 },
    { text: `${material.course.name} (${material.course.code})`, size: 12, gap: 2 },
    { text: material.course.department.faculty.name, size: 10, color: [0.47, 0.44, 0.42], gap: 2 },
    { text: material.course.department.name, size: 10, color: [0.47, 0.44, 0.42], gap: 14 },
    { text: "Të dhënat e materialit", size: 13, bold: true, gap: 6 },
    { text: `Lloji: ${MATERIAL_TYPE_LABELS[material.type as MaterialType] ?? material.type}`, gap: 2 },
    { text: `Viti akademik: ${material.academicYear}`, gap: 2 },
    { text: `Profesori: ${material.professor ?? "i pashënuar"}`, gap: 2 },
    { text: `Faqe: ${material.pages ?? "e pashënuar"}`, gap: 2 },
    {
      text: `Vlerësimi: ${material.ratingCount > 0 ? `${material.rating.toFixed(1)} nga ${material.ratingCount} studentë` : "ende pa vlerësim"}`,
      gap: 2,
    },
    { text: `Shkarkime: ${material.downloads + 1}`, gap: 2 },
    {
      text: `Statusi: ${material.verificationStatus === "verified" ? "I verifikuar nga studentët" : "Pa verifikuar ende"}`,
      gap: 14,
    },
    { text: "Shënimi i ngarkuesit", size: 13, bold: true, gap: 6 },
    { text: material.description ?? "Pa shënim shtesë.", gap: 14 },
    { text: "Ngarkuar nga", size: 13, bold: true, gap: 6 },
    { text: `${material.uploader.name} (@${material.uploader.username})`, gap: 14 },
    {
      text: "Ky skedar u gjenerua nga Studentet.KS per llogarine tende. Materialet e ngarkuara nga studentet mbeten pronesi e autoreve te tyre. Nese ky material shkel te drejtat e autorit, raportoje dhe hiqet brenda 48 oreve.",
      size: 9,
      color: [0.47, 0.44, 0.42],
    },
  ];

  const pdf = buildPdf(material.title, lines);
  const fileName = `${material.course.code}-${material.id.slice(-6)}.pdf`;

  return new Response(pdf as BodyInit, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${fileName}"`,
      "cache-control": "no-store",
    },
  });
}
