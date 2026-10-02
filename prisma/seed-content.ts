// Njoftimet tona dhe reklamat për prodhim.
//
// `seed-base.ts` mbjell universitetet dhe lëndët, kurse kjo mbjell zërin e
// platformës: çfarë organizojmë ne dhe kush e mban të hapur shtëpinë. E sigurt
// të lëshohet sa herë të duash: çdo zë shtohet vetëm nëse mungon.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/** E enjtja e ardhshme në orën 7:00, ora e nisjes së udhëtimit. */
function nextThursday(hour = 7): Date {
  const date = new Date();
  const days = (4 - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 86_400_000);
}

const ANNOUNCEMENTS = [
  {
    kind: "trip",
    title: "Këtë të enjte, udhëtim në Sarandë",
    titleEn: "This Thursday, a trip to Sarandë",
    body: "Nisja në orën 7:00 nga Qendra Studentore, kthimi të dielën në mbrëmje. Transporti dhe fjetja të përfshira, vendet janë të kufizuara.",
    bodyEn: "We leave at 7:00 from the Student Center and come back Sunday evening. Transport and accommodation included, places are limited.",
    place: "Qendra Studentore, Prishtinë",
    eventAt: nextThursday(),
    priority: 2,
    url: null as string | null,
  },
  {
    kind: "notice",
    title: "Tregu i librave hapet këtë javë",
    titleEn: "The book market opens this week",
    body: "Shit ose fal librat që nuk të duhen më, dhe gjej ato të vitit tjetër te Tregu. Takimi bëhet në fakultet, pa ndërmjetës.",
    bodyEn: "Sell or give away the books you no longer need, and find next year's on the Marketplace. You meet at the faculty, with nobody in between.",
    place: null as string | null,
    eventAt: null as Date | null,
    priority: 1,
    url: "/tregu" as string | null,
  },
  {
    kind: "meetup",
    title: "Takim i hapur i Studentët.KS",
    titleEn: "Open Studentët.KS meetup",
    body: "Na thuaj çfarë duhet të ndryshojë te platforma. Vijnë studentë nga të gjitha fakultetet, kafja është e jona.",
    bodyEn: "Tell us what should change on the platform. Students from every faculty come along, the coffee is on us.",
    place: "Biblioteka Kombëtare",
    eventAt: daysFromNow(10),
    priority: 0,
    url: null as string | null,
  },
];

const ADS = [
  {
    advertiser: "KFC Kosova",
    title: "20 për qind zbritje për studentë",
    titleEn: "20 percent off for students",
    body: "Me kodin STUDENTETKS, çdo ditë deri në orën 16:00, në të gjitha lokacionet në Kosovë.",
    bodyEn: "With the code STUDENTETKS, every day until 16:00, at every location in Kosovo.",
    cta: "Merr kodin",
    ctaEn: "Get the code",
    url: "https://kfc-ks.com",
    priority: 9,
  },
  {
    advertiser: "Gjirafa50",
    title: "Laptop për fakultet, me këste pa kamatë",
    titleEn: "A laptop for university, interest free instalments",
    body: "Zgjedhje e gjerë laptopësh për studentë, me dorëzim brenda 24 orësh në tërë Kosovën.",
    bodyEn: "A wide range of student laptops, delivered within 24 hours across Kosovo.",
    cta: "Shiko ofertat",
    ctaEn: "See the offers",
    url: "https://gjirafa50.com",
    priority: 6,
  },
  {
    advertiser: "ProCredit Bank",
    title: "Llogaria studentore pa provizion",
    titleEn: "A student account with no fees",
    body: "Pa pagesë mirëmbajtjeje deri në moshën 26 vjeç, me kartelë debiti dhe banking digjital.",
    bodyEn: "No maintenance fee until you turn 26, with a debit card and digital banking.",
    cta: "Hap llogarinë",
    ctaEn: "Open an account",
    url: "https://procreditbank-kos.com",
    priority: 4,
  },
];

async function main() {
  for (const item of ANNOUNCEMENTS) {
    const exists = await db.announcement.findFirst({ where: { title: item.title } });
    if (exists) continue;

    await db.announcement.create({
      data: {
        kind: item.kind,
        title: item.title,
        titleEn: item.titleEn,
        body: item.body,
        bodyEn: item.bodyEn,
        place: item.place,
        eventAt: item.eventAt,
        url: item.url,
        priority: item.priority,
        isActive: true,
        endsAt: item.eventAt ? new Date(item.eventAt.getTime() + 86_400_000) : daysFromNow(30),
      },
    });
  }

  for (const ad of ADS) {
    const advertiser =
      (await db.advertiser.findFirst({ where: { name: ad.advertiser } })) ??
      (await db.advertiser.create({
        data: { name: ad.advertiser, contact: "kontakt@studentet.example" },
      }));

    const exists = await db.ad.findFirst({ where: { title: ad.title } });
    if (exists) continue;

    await db.ad.create({
      data: {
        advertiserId: advertiser.id,
        title: ad.title,
        titleEn: ad.titleEn,
        body: ad.body,
        bodyEn: ad.bodyEn,
        cta: ad.cta,
        ctaEn: ad.ctaEn,
        url: ad.url,
        targeting: "{}",
        priority: ad.priority,
        budgetCents: 100000,
        isActive: true,
        endsAt: daysFromNow(120),
      },
    });
  }

  const announcements = await db.announcement.count();
  const ads = await db.ad.count();
  console.log(`seed-content: ${announcements} njoftime, ${ads} reklama.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
