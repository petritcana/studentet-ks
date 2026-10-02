import { db } from "@/lib/db";
import { canViewMaterial, materialAccessFilter, type AccessUser } from "@/lib/access";
import { cosineSimilarity, embed, lexicalOverlap, parseVector } from "./embeddings";
import type { AiSource } from "./provider";

/**
 * Sa nga fjalët e pyetjes duhet të dalin te materiali që ai të hyjë.
 *
 * Me çdo përputhje mbi zero, «Sa bën 4 x 4 / 4?» sillte Makina elektrike si burim
 * dhe ftesën «9 materiale me Pro», sepse një fjalë e rastësishme gjendej kudo.
 */
const MIN_OVERLAP = 0.34;

export async function retrieve(
  user: AccessUser,
  question: string,
  locale: string,
  limit = 5,
  context?: { kind: "material" | "course" | "job"; id: string },
): Promise<AiSource[]> {
  const english = locale === "en";
  const accessFilter = materialAccessFilter(user);

  const rows = await db.materialEmbedding.findMany({
    where: { material: accessFilter },
    take: 400,
    select: {
      chunk: true,
      content: true,
      vector: true,
      material: {
        select: {
          id: true,
          title: true,
          courseId: true,
          course: { select: { name: true, nameEn: true, department: { select: { facultyId: true } } } },
        },
      },
    },
  });

  const query = embed(question);

  // Faqja ku ndodhet studenti peshon me shumë se ngjashmeria e pastert: nëse po
  // lexon një material dhe pyet për te, ai material duhet te dale i pari.
  const boostMaterial = context?.kind === "material" ? context.id : null;
  const boostCourse = context?.kind === "course" ? context.id : null;

  return rows
    .map((row) => {
      const boosted =
        (row.material.id === boostMaterial ? 1 : 0) +
        (boostCourse && row.material.courseId === boostCourse ? 0.5 : 0);
      // Me dy materiale njësoj të afërta, ai i fakultetit të studentit fiton.
      const ownFaculty =
        user.facultyId && row.material.course.department.facultyId === user.facultyId ? 0.25 : 0;

      // Pa mbivendosje fjalesh copeza nuk hyn, përveç kur është faqja ku ndodhet
      // studenti: aty konteksti e justifikon vetë.
      const overlap = lexicalOverlap(question, `${row.material.title} ${row.content}`);
      // Një fjalë e vetme e rastësishme nuk mjafton: të paktën një e treta e pyetjes.
      if (overlap < MIN_OVERLAP && boosted === 0) return null;

      return {
        score: cosineSimilarity(query, parseVector(row.vector)) + overlap * 2 + boosted + ownFaculty,
        source: {
          materialId: row.material.id,
          title: row.material.title,
          courseName: english ? row.material.course.nameEn : row.material.course.name,
          chunk: row.chunk,
          // Copeza e plote, jo 320 shkronjat e para: fjalia që i pergjigjet
          // pyetjes rrallë është e para, dhe prerja e hiqte fare nga pamja.
          excerpt: row.content,
        } satisfies AiSource,
      };
    })
    .filter((item) => item !== null)
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    // Një copeze për material. Dy copeza te te njejtit material do te dilnin si
    // dy karta burimi identike, dhe studenti do te mendonte se ka dy materiale.
    .filter((item, index, all) => {
      return all.findIndex((other) => other.source.materialId === item.source.materialId) === index;
    })
    .slice(0, limit)
    .map((item) => item.source);
}

/**
 * Sa materiale jashtë rrethit do ta shpjegonin më mirë këtë pyetje.
 *
 * Numri shfaqet si nxitje e ndershme («Ka 4 materiale që e shpjegojnë më mirë»),
 * kurrë si bllokim: pyetja merr përgjigje edhe pa Pro.
 */
export async function countLockedMatches(user: AccessUser, question: string): Promise<number> {
  const rows = await db.materialEmbedding.findMany({
    take: 400,
    select: {
      vector: true,
      content: true,
      material: {
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
      },
    },
  });

  const query = embed(question);
  const locked = new Set<string>();

  for (const row of rows) {
    if (cosineSimilarity(query, parseVector(row.vector)) <= 0) continue;
    if (lexicalOverlap(question, `${row.material.title} ${row.content}`) < MIN_OVERLAP) continue;
    if (!canViewMaterial(user, row.material).allowed) locked.add(row.material.id);
  }

  return locked.size;
}
