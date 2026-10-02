/**
 * E bën një llogari admin, të verifikuar dhe me Pro.
 *
 * Lëshohet me emailin si argument. Punon njësoj lokalisht dhe në prodhim: baza
 * merret nga `DATABASE_URL`, prandaj skripti nuk mban asnjë çelës brenda vetes.
 *
 *   node scripts/promote-admin.mjs dikush@example.com
 */
import { PrismaClient } from "@prisma/client";

const email = process.argv[2];
if (!email) {
  console.error("Përdorimi: node scripts/promote-admin.mjs <email>");
  process.exit(1);
}

const db = new PrismaClient();
const YEAR = 365 * 86_400_000;

const user = await db.user.findUnique({
  where: { email },
  select: { id: true, name: true, username: true, role: true },
});

if (!user) {
  console.error(`S'u gjet llogari me emailin ${email}.`);
  await db.$disconnect();
  process.exit(1);
}

await db.user.update({
  where: { id: user.id },
  data: {
    role: "admin",
    isVerified: true,
    verification: "verified",
    emailVerified: new Date(),
    // Pro nga kontributi: pa pagesë dhe pa datë skadimi praktike.
    proEarnedUntil: new Date(Date.now() + 10 * YEAR),
    proDaysEarned: 3650,
    onboardedAt: new Date(),
  },
});

// Një abonim aktiv e mban Pro-n edhe atje ku lexohet abonimi, jo ditët e fituara.
const plan = await db.plan.findFirst({ orderBy: { sortOrder: "desc" }, select: { id: true } });
const existing = await db.subscription.findFirst({
  where: { userId: user.id, status: "active" },
  select: { id: true },
});

if (existing) {
  await db.subscription.update({
    where: { id: existing.id },
    data: { expiresAt: new Date(Date.now() + 10 * YEAR) },
  });
} else {
  await db.subscription.create({
    data: {
      userId: user.id,
      planId: plan?.id ?? null,
      status: "active",
      source: "manual",
      expiresAt: new Date(Date.now() + 10 * YEAR),
    },
  });
}

const badge = await db.badge.findUnique({ where: { code: "verified" }, select: { id: true } });
if (badge) {
  const has = await db.userBadge.findFirst({ where: { userId: user.id, badgeId: badge.id } });
  if (!has) await db.userBadge.create({ data: { userId: user.id, badgeId: badge.id } });
}

console.log(`${user.name} (@${user.username}) tani është admin me Pro.`);
await db.$disconnect();
