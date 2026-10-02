// Përgatit bazën e prodhimit para `prisma db push`, në çdo deploy.
//
// `db push` nuk di të mbushë të dhëna: kur skema shton një kufizim mbi një kolonë
// që ka rreshta të vjetër, ai ndalet ose kërkon `--accept-data-loss`. Këtu bëhen
// hapat e të dhënave para tij, secili i sigurt për t'u përsëritur. Nuk fshin asgjë.
//
// 1. `University.slug`: universitetet e krijuara nga seed-base i vjetër e kishin
//    bosh (""), prandaj kufizimi UNIQUE nuk hynte dhe faqja e garës për
//    universitetin (`/gara/universiteti/[slug]`) nuk hapej. Slug-u merret nga
//    katalogu sipas shkurtesës; pastaj indeksi krijohet me emrin që pret Prisma,
//    dhe `db push` e gjen gati. Nëse mbetet ndonjë dublikatë, indeksi dështon dhe
//    deploy-i ndalet pa prekur asgjë tjetër.
import { PrismaClient } from "@prisma/client";
import { INSTITUTIONS } from "./academic/catalog";

const db = new PrismaClient();

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function tableExists(name: string) {
  const rows = await db.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) AS "exists"`,
    name,
  );
  return rows[0]?.exists === true;
}

async function universitySlugs() {
  if (!(await tableExists("University"))) return;

  const rows = await db.$queryRawUnsafe<{ id: string; abbr: string; name: string; slug: string | null }[]>(
    `SELECT id, abbr, name, slug FROM "University" ORDER BY "createdAt" ASC`,
  );

  const taken = new Set(rows.map((row) => row.slug).filter((slug): slug is string => Boolean(slug)));
  const seen = new Set<string>();
  let filled = 0;

  for (const row of rows) {
    // Slug-u i parë i një vlere mbetet; i dyti i njëjtë trajtohet si bosh.
    if (row.slug && !seen.has(row.slug)) {
      seen.add(row.slug);
      continue;
    }

    const match = INSTITUTIONS.find(
      (item) => item.abbr.toLowerCase() === row.abbr.toLowerCase() || item.name === row.name,
    );
    let slug = match?.slug ?? slugify(row.abbr || row.name);
    if (!slug || taken.has(slug)) slug = `${slug || "universiteti"}-${row.id.slice(-6)}`;
    taken.add(slug);
    seen.add(slug);

    await db.$executeRawUnsafe(`UPDATE "University" SET slug = $1 WHERE id = $2`, slug, row.id);
    filled += 1;
  }

  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "University_slug_key" ON "University"("slug")`);
  console.log(`migrate-before-push: ${rows.length} universitete, ${filled} slug të plotësuar, indeksi gati.`);
}

async function main() {
  await universitySlugs();
}

main()
  .catch((error) => {
    console.error("migrate-before-push:", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
