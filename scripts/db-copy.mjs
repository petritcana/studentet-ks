/**
 * Kopjon tërë bazën nga një Postgres në një tjetër.
 *
 * Arsyeja është shpejtësia: serveri i Netlify punon në us-east-2, dhe çdo pyetje
 * drejt një baze në Evropë paguan rreth 100 milisekonda. Me bazën në të njëjtin
 * rajon, e njëjta faqe bën të njëjtat pyetje në pak milisekonda.
 *
 * Përdorimi:
 *   SOURCE_URL="postgres://..." TARGET_URL="postgres://..." node scripts/db-copy.mjs
 *
 * Tabelat kopjohen në rendin e varësive, me `createMany` dhe pa prekur burimin.
 * Skripti nuk fshin asgjë te burimi dhe mund të lëshohet sërish: te caku fshin
 * vetëm atë që do ta rishkruajë.
 */
import { PrismaClient } from "@prisma/client";

const sourceUrl = process.env.SOURCE_URL;
const targetUrl = process.env.TARGET_URL;

if (!sourceUrl || !targetUrl) {
  console.error("Duhen SOURCE_URL dhe TARGET_URL.");
  process.exit(1);
}

const source = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
const target = new PrismaClient({ datasources: { db: { url: targetUrl } } });

/** Rendi ndjek varësitë: prindi para fëmijës. */
const TABLES = [
  "university", "faculty", "department", "course", "user", "account", "session",
  "verificationToken", "enrollment", "scheduleSlot", "examDate", "follow", "userBlock",
  "invite", "group", "groupMember", "event", "rsvp", "material", "materialRating",
  "materialEmbedding", "post", "comment", "bookmark", "reaction", "pollOption", "pollVote",
  "question", "answer", "answerVote", "conversation", "conversationMember", "message",
  "company", "jobPost", "application", "careerProfile", "scholarship", "badge", "userBadge",
  "plan", "subscription", "payment", "voucher", "xpTransaction", "onlineCourse", "courseSection",
  "lesson", "lessonProgress", "courseEnrollment", "courseReview", "ledgerEntry", "payout",
  "certificate", "advertiser", "ad", "adImpression", "adClick", "announcement", "notification",
  "notificationSetting", "pushSubscription", "report", "moderationLog", "auditLog",
  "verification", "emailCode", "story", "storyView", "mediaAsset", "marketListing",
  "studyTogether", "studyTogetherJoin", "voiceRoom", "voiceParticipant", "voiceMessage",
  "aiConversation", "aiMessage",
];

const BATCH = 200;

for (const table of TABLES) {
  const readModel = source[table];
  const writeModel = target[table];
  if (!readModel || !writeModel) {
    console.log(`  (kalohet ${table}: s'ekziston te skema)`);
    continue;
  }

  const rows = await readModel.findMany();
  if (rows.length === 0) continue;

  for (let index = 0; index < rows.length; index += BATCH) {
    await writeModel.createMany({ data: rows.slice(index, index + BATCH), skipDuplicates: true });
  }
  console.log(`  ${table}: ${rows.length}`);
}

console.log("Kopjimi mbaroi.");
await source.$disconnect();
await target.$disconnect();
