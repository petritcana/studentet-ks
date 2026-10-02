/**
 * Rregullon llogaritë e krijuara para sistemit të ri të emrave.
 *
 * Bën tri gjëra, dhe asnjë prej tyre nuk fshin asgjë:
 *   1. ndan emrin e plotë te emri dhe mbiemri, kur mungojnë;
 *   2. i sjell emrat e përdoruesit te forma emri.mbiemri, kur nuk janë;
 *   3. i kalon me shkronja të vogla, që krahasimi të jetë i njëjtë kudo.
 *
 * Lëshohet me `node scripts/backfill-usernames.mjs [--apply]`. Pa `--apply`
 * vetëm tregon çfarë do të ndryshonte.
 */
import { PrismaClient } from "@prisma/client";

const apply = process.argv.includes("--apply");
const db = new PrismaClient();

function fold(value) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ë/g, "e")
    .replace(/ç/g, "c")
    .replace(/[’'`]/g, "")
    .replace(/[\s_-]+/g, ".")
    .replace(/[^a-z0-9.]/g, "")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "");
}

const users = await db.user.findMany({
  select: { id: true, name: true, username: true, email: true, firstName: true, lastName: true },
  orderBy: { createdAt: "asc" },
});

const taken = new Set(users.map((user) => user.username.toLowerCase()));
let changed = 0;

for (const user of users) {
  const parts = user.name.trim().split(/\s+/);
  const firstName = user.firstName ?? parts[0] ?? user.name;
  const lastName = user.lastName ?? (parts.length > 1 ? parts.slice(1).join(" ") : null);

  const base = [fold(firstName), fold(lastName ?? "")].filter(Boolean).join(".") ||
    fold(user.email.split("@")[0]);

  let username = user.username.toLowerCase();

  // Emri ndryshohet vetëm kur nuk e ndjek formën e re, që lidhjet e vjetra të mos prishen.
  if (username !== base && !new RegExp(`^${base}\\d*$`).test(username)) {
    taken.delete(username);
    let candidate = base;
    let attempt = 1;
    while (taken.has(candidate)) {
      candidate = `${base}${attempt}`;
      attempt += 1;
    }
    username = candidate;
    taken.add(candidate);
  }

  const needsUpdate =
    username !== user.username ||
    user.firstName !== firstName ||
    (user.lastName ?? null) !== (lastName ?? null);

  if (!needsUpdate) continue;
  changed += 1;

  const what =
    username !== user.username
      ? `@${user.username} -> @${username}`
      : "u plotësua emri dhe mbiemri";
  console.log(`${user.name}: ${what}`);
  if (apply) {
    await db.user.update({
      where: { id: user.id },
      data: { username, firstName, lastName: lastName ?? null },
    });
  }
}

console.log(
  changed === 0
    ? "Asgjë për të ndryshuar."
    : apply
      ? `${changed} llogari u rregulluan.`
      : `${changed} llogari do të rregulloheshin. Lësho me --apply.`,
);
await db.$disconnect();
