// Ndërton skemën për PostgreSQL nga prisma/schema.prisma.
//
// Lokalisht baza është SQLite, në prodhim PostgreSQL. Skema është e bartshme,
// prandaj ndryshon vetëm `provider`. Burimi mbetet një skedar i vetëm.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const source = readFileSync("prisma/schema.prisma", "utf8");
const pattern = /(datasource db \{[^}]*provider\s*=\s*)"sqlite"/;
if (!pattern.test(source)) {
  console.error("prisma-postgres: s'u gjet provider sqlite te datasource db.");
  process.exit(1);
}

// Funksionet e Netlify-t punojnë në Linux, prandaj motori i Linux-it shtohet
// pranë atij të makinës ku bëhet build-i.
const generator = /(generator client \{[^}]*provider\s*=\s*"prisma-client-js")/;
const output = source
  .replace(pattern, '$1"postgresql"')
  .replace(generator, '$1\n  binaryTargets = ["native", "rhel-openssl-3.0.x"]');

mkdirSync("prisma/postgres", { recursive: true });
writeFileSync("prisma/postgres/schema.prisma", output);
console.log("prisma-postgres: u shkrua prisma/postgres/schema.prisma");
