/** Seed realist. */

import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { chunkText, embed, serializeVector } from "../lib/ai/embeddings";
import { serializeList } from "../lib/db";
import { serializeMedia, type MediaRef } from "../lib/media";
import { buildSeedMedia, type SeededMedia } from "./seed-media";
import { COURSES as ONLINE_COURSES } from "./seed-courses";

/** Nga foto e ruajtur te referenca që mban postimi. */
const toMediaRef = (item: SeededMedia): MediaRef => ({
  id: item.id,
  kind: item.kind,
  extension: item.extension,
  width: item.width,
  height: item.height,
  durationMs: item.durationMs,
});
import {
  ADVERTISERS,
  ANSWER_TEXTS,
  BADGES,
  BIO_TEMPLATES,
  CAMPUS_VOICE_POSTS,
  COMMENTS,
  COMPANIES,
  COURSES,
  EVENT_SEEDS,
  FEMALE_NAMES,
  HIGH_SCHOOLS,
  JOB_SEEDS,
  MALE_NAMES,
  MATERIAL_DESCRIPTIONS,
  MATERIAL_TITLES,
  OTHER_FACULTIES,
  PLANS,
  POLL_SEEDS,
  QUESTION_BODIES,
  QUESTION_TITLES,
  SEEK_POSTS,
  STRONG_SUBJECTS,
  SURNAMES,
  TEXT_POSTS,
  UNIVERSITIES,
  UP_FACULTIES,
  WEAK_SUBJECTS,
} from "./seed-data";
import { courseNotes } from "./seed-notes";

const db = new PrismaClient();

let state = 20260910;
const random = () => {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
};
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
const pickMany = <T>(items: readonly T[], count: number): T[] => {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < count && pool.length > 0) {
    out.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }
  return out;
};
const chance = (probability: number) => random() < probability;
const between = (min: number, max: number) => Math.floor(random() * (max - min + 1)) + min;
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000);
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);
const daysFromNow = (days: number, hour = 10) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
};
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

const ACADEMIC_YEAR = "2025/26";
const YEAR_ROMAN = ["I", "II", "III", "IV"];

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/ë/g, "e")
    .replace(/ç/g, "c")
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9.]/g, "");

type DemoSpec = {
  name: string;
  /** Vetëm për avatarin e parazgjedhur, kur llogaria nuk ka foto. */
  gender: "male" | "female";
  faculty: string;
  year: number;
  level: string;
  city: string;
  role: string;
  verified: boolean;
  pro: "none" | "paid" | "earned";
  demoLabel: string;
  xpContribution: number;
  xpActivity: number;
  bio: string;
};

const DEMO_USERS: DemoSpec[] = [
  {
    name: "Arian Bytyqi",
    gender: "male",
    faculty: "FIEK",
    year: 1,
    level: "bachelor",
    city: "Gjilan",
    role: "student",
    verified: false,
    pro: "none",
    demoLabel: "free-new",
    xpContribution: 0,
    xpActivity: 15,
    bio: "FIEK, viti I. Sapo fillova, ende po e mësoj ku është çka.",
  },
  {
    name: "Erza Krasniqi",
    gender: "female",
    faculty: "MJK",
    year: 3,
    level: "bachelor",
    city: "Prishtinë",
    role: "student",
    verified: true,
    pro: "none",
    demoLabel: "free-verified",
    xpContribution: 180,
    xpActivity: 940,
    bio: "Mjekësi, viti III. I mbaj shënimet rregullt dhe i ndaj pa problem.",
  },
  {
    name: "Blerim Gashi",
    gender: "male",
    faculty: "EKO",
    year: 1,
    level: "master",
    city: "Prishtinë",
    role: "student",
    verified: true,
    pro: "paid",
    demoLabel: "pro-paid",
    xpContribution: 240,
    xpActivity: 620,
    bio: "Master në Ekonomik, punoj gjysmë orari. Vij për praktika dhe kontakte.",
  },
  {
    name: "Dea Morina",
    gender: "female",
    faculty: "ART",
    year: 2,
    level: "bachelor",
    city: "Pejë",
    role: "student",
    verified: true,
    pro: "earned",
    demoLabel: "pro-earned",
    xpContribution: 1180,
    xpActivity: 780,
    bio: "Arte, viti II. Kam ngarkuar tetëmbëdhjetë materiale dhe Pro-n e kam falas.",
  },
  {
    name: "Rina Ahmeti",
    gender: "female",
    faculty: "FSHMN",
    year: 2,
    level: "bachelor",
    city: "Ferizaj",
    role: "student",
    verified: true,
    pro: "none",
    demoLabel: "free-rich-xp",
    xpContribution: 3400,
    xpActivity: 510,
    bio: "FSHMN, viti II. Kam XP të pashpenzuar dhe ende s'e kam vendosur çka të bëj me të.",
  },
  {
    name: "Endrit Rexhepi",
    gender: "male",
    faculty: "FIEK",
    year: 3,
    level: "bachelor",
    city: "Prishtinë",
    role: "student",
    verified: true,
    pro: "earned",
    demoLabel: "course-leader",
    xpContribution: 2260,
    xpActivity: 1340,
    bio: "FIEK, viti III. Lider i lëndës në Algoritme. Pyet pa ngurrim.",
  },
  {
    name: "Vlora Berisha",
    gender: "female",
    faculty: "JUR",
    year: 4,
    level: "bachelor",
    city: "Prizren",
    role: "moderator",
    verified: true,
    pro: "earned",
    demoLabel: "moderator",
    xpContribution: 890,
    xpActivity: 2100,
    bio: "Juridik, viti IV. Moderatore e universitetit.",
  },
  {
    name: "Fisnik Hoxha",
    gender: "male",
    faculty: "EKO",
    year: 4,
    level: "bachelor",
    city: "Prishtinë",
    role: "admin",
    verified: true,
    pro: "paid",
    demoLabel: "admin",
    xpContribution: 460,
    xpActivity: 1800,
    bio: "Administrator i platformës.",
  },
];

async function clear() {
  const tables = [
    // Gara: rreshtat e saj tregojnë te përdorues dhe universitete që rikrijohen.
    db.battleAnswer, db.battleEntry, db.battle, db.teamEvent, db.competitionPoint,
    db.competitorStats, db.competitionEvent, db.competitionWeek, db.rankSnapshot,
    db.universityAchievement,
    db.adClick, db.adImpression, db.ad, db.advertiser,
    db.pushSubscription, db.moderationLog, db.report, db.notification,
    db.marketListing, db.aiMessage, db.aiConversation, db.materialEmbedding, db.announcement,
    db.storyHighlightItem, db.storyHighlight, db.storyView, db.story, db.emailCode, db.verification,
    db.application, db.careerProfile, db.scholarship,
    db.studyTogetherJoin, db.studyTogether, db.notificationSetting,
    db.certificate, db.payout, db.ledgerEntry, db.courseReview, db.lessonProgress,
    db.courseEnrollment, db.lesson, db.courseSection, db.onlineCourse,
    db.xpTransaction, db.voucher, db.payment, db.subscription, db.plan,
    db.userBadge, db.badge, db.jobPost, db.company,
    db.rsvp, db.message, db.conversationMember, db.conversation,
    db.groupMember, db.answerVote, db.answer, db.question,
    db.materialRating, db.pollVote, db.pollOption, db.reaction,
    db.bookmark, db.comment, db.post, db.material,
    db.event, db.group, db.invite, db.userBlock, db.follow,
    db.enrollment, db.examDate, db.scheduleSlot, db.course,
    db.session, db.account, db.verificationToken, db.user,
    db.department, db.faculty, db.university,
  ];
  for (const table of tables) {
    await (table as { deleteMany: () => Promise<unknown> }).deleteMany();
  }
}

async function main() {
  console.log("Po pastrohet baza...");
  await clear();

  // 1. Institucionet ---------------------------------------------------------
  console.log("Universitetet, fakultetet dhe lëndët...");
  const universities = new Map<string, { id: string }>();
  for (const university of UNIVERSITIES) {
    // Slug-u është çelësi i qëndrueshëm i institucionit; pa të, seed-i i dytë
    // përplaset me të parin te kufizimi unik.
    const created = await db.university.create({
      data: { ...university, slug: slug(university.abbr) },
    });
    universities.set(university.abbr, created);
  }

  const faculties = new Map<string, { id: string; color: string; universityId: string; name: string }>();
  for (const faculty of UP_FACULTIES) {
    const created = await db.faculty.create({
      data: { ...faculty, slug: slug(faculty.abbr), universityId: universities.get("UP")!.id },
    });
    faculties.set(faculty.abbr, created);
  }
  for (const faculty of OTHER_FACULTIES) {
    const { university, ...rest } = faculty;
    const created = await db.faculty.create({
      data: { ...rest, slug: slug(rest.abbr), universityId: universities.get(university)!.id },
    });
    faculties.set(faculty.abbr, created);
  }

  const departments = new Map<string, { id: string; facultyId: string }>();
  const courses: {
    id: string;
    name: string;
    code: string;
    year: number;
    semester: number;
    professor: string;
    facultyAbbr: string;
    facultyId: string;
    facultyColor: string;
    universityId: string;
  }[] = [];

  for (const course of COURSES) {
    const faculty = faculties.get(course.faculty)!;
    const departmentKey = `${course.faculty}:${course.department}`;

    if (!departments.has(departmentKey)) {
      departments.set(
        departmentKey,
        await db.department.create({
          data: { facultyId: faculty.id, name: course.department, nameEn: course.departmentEn },
        }),
      );
    }

    const created = await db.course.create({
      data: {
        departmentId: departments.get(departmentKey)!.id,
        name: course.name,
        nameEn: course.nameEn,
        code: course.code,
        year: course.year,
        semester: course.semester,
        ects: course.ects,
        professor: course.professor,
      },
    });

    courses.push({
      id: created.id,
      name: created.name,
      code: created.code,
      year: created.year,
      semester: created.semester,
      professor: created.professor,
      facultyAbbr: course.faculty,
      facultyId: faculty.id,
      facultyColor: faculty.color,
      universityId: faculty.universityId,
    });

    const firstDay = between(1, 4);
    const secondDay = ((firstDay + 2 - 1) % 5) + 1;
    const startHour = between(8, 16);
    await db.scheduleSlot.createMany({
      data: [
        {
          courseId: created.id,
          dayOfWeek: firstDay,
          startTime: `${String(startHour).padStart(2, "0")}:00`,
          endTime: `${String(startHour + 2).padStart(2, "0")}:00`,
          room: `Salla ${between(1, 14)}`,
          kind: "lecture",
        },
        {
          courseId: created.id,
          dayOfWeek: secondDay,
          startTime: `${String(startHour + 1).padStart(2, "0")}:00`,
          endTime: `${String(startHour + 2).padStart(2, "0")}:00`,
          room: `Salla ${between(1, 14)}`,
          kind: "exercise",
        },
      ],
    });

    await db.examDate.create({
      data: {
        courseId: created.id,
        term: pick(["Afati i janarit", "Afati i qershorit", "Afati i shtatorit"]),
        date: daysFromNow(between(5, 60), between(9, 14)),
        room: `Amfiteatri ${pick(["A", "B", "C"])}`,
      },
    });
  }

  console.log(`  ${faculties.size} fakultete, ${courses.length} lëndë`);

  // 2. Planet dhe badge-t ----------------------------------------------------
  for (const plan of PLANS) await db.plan.create({ data: plan });

  const badges = new Map<string, { id: string }>();
  for (const badge of BADGES) {
    badges.set(badge.code, await db.badge.create({ data: badge }));
  }

  // 3. Përdoruesit -----------------------------------------------------------
  console.log("Përdoruesit...");
  const passwordHash = await bcrypt.hash("provoje123", 10);
  const usernames = new Set<string>();

  type SeededUser = {
    id: string;
    name: string;
    username: string;
    facultyAbbr: string;
    facultyId: string;
    universityId: string;
    year: number;
    city: string;
    highSchool: string | null;
    interests: string[];
    isVerified: boolean;
    role: string;
    demoLabel: string | null;
    courseIds: string[];
  };

  const users: SeededUser[] = [];

  async function createUser(input: {
    name: string;
    gender?: "male" | "female" | null;
    facultyAbbr: string;
    year: number;
    level: string;
    city: string;
    role?: string;
    verified: boolean;
    pro?: "none" | "paid" | "earned";
    demoLabel?: string | null;
    xpContribution?: number;
    xpActivity?: number;
    bio?: string;
    createdAt?: Date;
  }) {
    const faculty = faculties.get(input.facultyAbbr)!;
    const facultyCourses = courses.filter((course) => course.facultyAbbr === input.facultyAbbr);
    const department = facultyCourses[0]
      ? (await db.course.findUnique({ where: { id: facultyCourses[0].id } }))!.departmentId
      : null;

    // Titujt akademike nuk hyjne te emri i përdoruesit: "Prof. Dr. Ardian" do te
    // jepte "prof..dr..ardian", i cili nuk lexohet dhe nuk shkruhet dot.
    const bareName = input.name.replace(/^(Prof\.|Dr\.|Ass\.|MSc\.|PhD\.)\s*/gi, "").replace(/^(Prof\.|Dr\.|Ass\.)\s*/gi, "").trim();
    let username = slug(bareName);
    let attempt = 1;
    while (usernames.has(username)) {
      attempt += 1;
      username = `${slug(bareName)}${attempt}`;
    }
    usernames.add(username);

    const domain = input.verified
      ? (UNIVERSITIES.find((item) => item.abbr === (faculty.universityId === universities.get("UP")!.id ? "UP" : "UBT"))?.emailDomain ?? "student.uni-pr.edu")
      : "gmail.com";

    const interests = pickMany(
      ["programming", "design", "music", "sport", "entrepreneurship", "volunteering", "languages", "photography", "gaming", "literature", "activism"],
      between(2, 5),
    );

    const created = await db.user.create({
      data: {
        email: `${username}@${domain}`,
        passwordHash,
        username,
        name: input.name,
        gender: input.gender ?? null,
        bio: input.bio ?? null,
        universityId: faculty.universityId,
        facultyId: faculty.id,
        departmentId: department,
        year: input.year,
        level: input.level,
        city: input.city,
        highSchool: chance(0.7) ? pick(HIGH_SCHOOLS) : null,
        isVerified: input.verified,
        verification: input.verified ? "verified" : "unverified",
        role: input.role ?? "student",
        interests: JSON.stringify(interests),
        xpContribution: input.xpContribution ?? between(0, 900),
        xpActivity: input.xpActivity ?? between(20, 2400),
        dailyStreak: chance(0.6) ? between(1, 42) : 0,
        lastStreakAt: hoursAgo(between(1, 40)),
        // Çdo llogari demo e ka konfirmuar emailin, sepse ashtu e bën çdo llogari
        // e vërtetë: pa këtë hap nuk hyhet fare. `verified` mbetet shenja e
        // emailit institucional, gjë tjetër.
        emailVerified: hoursAgo(between(24, 2000)),
        onboardedAt: hoursAgo(between(24, 3000)),
        demoLabel: input.demoLabel ?? null,
        createdAt: input.createdAt ?? hoursAgo(between(240, 5000)),
        lastSeenAt: chance(0.08) ? minutesAgo(between(0, 8)) : hoursAgo(between(1, 400)),
      },
    });

    // Pro sipas burimit.
    if (input.pro === "paid") {
      const plan = await db.plan.findUnique({ where: { code: "semester" } });
      await db.subscription.create({
        data: {
          userId: created.id,
          planId: plan?.id ?? null,
          status: "active",
          source: "payment",
          expiresAt: daysFromNow(between(40, 140)),
          autoRenew: true,
        },
      });
      await db.payment.create({
        data: {
          userId: created.id,
          amountCents: plan?.priceCents ?? 999,
          provider: "paddle",
          status: "paid",
          reference: `PDL-${created.id.slice(-8).toUpperCase()}`,
          externalId: `txn_${created.id.slice(-10)}`,
        },
      });
      const supporter = badges.get("pro_supporter");
      if (supporter) {
        await db.userBadge.create({ data: { userId: created.id, badgeId: supporter.id } });
      }
    } else if (input.pro === "earned") {
      await db.user.update({
        where: { id: created.id },
        data: {
          proDaysEarned: between(20, 90),
          proEarnedUntil: daysFromNow(between(15, 80)),
        },
      });
      await db.subscription.create({
        data: {
          userId: created.id,
          status: "active",
          source: "contribution",
          expiresAt: daysFromNow(between(15, 80)),
        },
      });
    }

    if (input.verified) {
      const badge = badges.get("verified")!;
      await db.userBadge.create({ data: { userId: created.id, badgeId: badge.id } });
    }

    await db.invite.create({
      data: {
        inviterId: created.id,
        code: `${username.split(".")[0].slice(0, 4).toUpperCase()}${between(1000, 9999)}`,
      },
    });

    const chosen = pickMany(
      facultyCourses.filter((course) => course.year === input.year).length >= 3
        ? facultyCourses.filter((course) => course.year === input.year)
        : facultyCourses,
      Math.min(facultyCourses.length, between(4, 6)),
    );

    for (const course of chosen) {
      await db.enrollment.create({
        data: { userId: created.id, courseId: course.id, academicYear: ACADEMIC_YEAR },
      });
    }

    users.push({
      id: created.id,
      name: created.name,
      username: created.username,
      facultyAbbr: input.facultyAbbr,
      facultyId: faculty.id,
      universityId: faculty.universityId,
      year: input.year,
      city: input.city,
      highSchool: created.highSchool,
      interests,
      isVerified: created.isVerified,
      role: created.role,
      demoLabel: created.demoLabel,
      courseIds: chosen.map((course) => course.id),
    });

    return created;
  }

  for (const demo of DEMO_USERS) {
    const { faculty, ...rest } = demo;
    await createUser({
      ...rest,
      facultyAbbr: faculty,
      createdAt: hoursAgo(demo.demoLabel === "free-new" ? 60 : between(2000, 6000)),
    });
  }

  // Llogaria e pronarit për testim lokal: admin me çdo qasje, Pro deri në 2099.
  // Hyn me «petrit.cana» ose emailin, dhe password-in e vet (jo atë të demos).
  const owner = await createUser({
    name: "Petrit Cana",
    gender: "male",
    facultyAbbr: "FIEK",
    year: 3,
    level: "bachelor",
    city: "Prishtinë",
    role: "admin",
    verified: true,
    xpContribution: 1500,
    xpActivity: 2200,
    bio: "Themeluesi i Studentët.KS.",
  });
  await db.user.update({
    where: { id: owner.id },
    data: { passwordHash: await bcrypt.hash("12341234", 10), proEarnedUntil: new Date("2099-12-31T23:59:59Z") },
  });

  // Gjashtë profesore te verifikuar, secili ne një fakultet tjetër. Pa ta, kurset
  // online dhe njoftimet e fakultetit do te ishin te zbrazeta.
  const PROFESSORS = [
    { name: "Prof. Dr. Ardian Krasniqi", gender: "male" as const, faculty: "FIEK", bio: "Rrjeta kompjuterike dhe siguri. Ligjëron në vitin e tretë." },
    { name: "Prof. Dr. Teuta Berisha", gender: "female" as const, faculty: "EKO", bio: "Statistikë e aplikuar dhe ekonometri." },
    { name: "Prof. Dr. Fatmir Hoxha", gender: "male" as const, faculty: "MJK", bio: "Anatomi dhe fiziologji e sistemit nervor." },
    { name: "Prof. Dr. Vjosa Morina", gender: "female" as const, faculty: "JUR", bio: "E drejta kushtetuese dhe praktika gjyqësore." },
    { name: "Ass. Blerta Gashi", gender: "female" as const, faculty: "FSHMN", bio: "Kimi organike. Asistente e laboratorit." },
    { name: "Prof. Dr. Driton Aliu", gender: "male" as const, faculty: "FIL", bio: "Gjuhësi dhe letërsi bashkëkohore shqipe." },
  ];

  for (const professor of PROFESSORS) {
    await createUser({
      name: professor.name,
      gender: professor.gender,
      facultyAbbr: professor.faculty,
      year: 0,
      level: "phd",
      city: "Prishtinë",
      role: "professor",
      verified: true,
      bio: professor.bio,
      xpContribution: between(400, 1400),
      xpActivity: between(200, 900),
      createdAt: hoursAgo(between(4000, 9000)),
    });
  }

  const facultyPool = [...UP_FACULTIES.map((item) => item.abbr), ...OTHER_FACULTIES.map((item) => item.abbr)];
  for (let index = 0; index < 70; index += 1) {
    const isFemale = chance(0.5);
    const first = pick(isFemale ? FEMALE_NAMES : MALE_NAMES);
    const last = pick(SURNAMES);
    const facultyAbbr = pick(facultyPool);
    const year = between(1, 4);
    const city = pick(["Prishtinë", "Prizren", "Pejë", "Gjakovë", "Gjilan", "Mitrovicë", "Ferizaj", "Vushtrri", "Podujevë", "Suharekë"]);
    const facultyName = faculties.get(facultyAbbr)!.name.replace("Fakulteti i ", "").replace("Fakulteti ", "");

    const bio = pick(BIO_TEMPLATES)
      .replace("{fakulteti}", facultyName)
      .replace("{viti}", `viti ${YEAR_ROMAN[year - 1]}`)
      .replace("{qyteti}", city)
      .replace("{fort}", pick(STRONG_SUBJECTS))
      .replace("{dobet}", pick(WEAK_SUBJECTS));

    await createUser({
      name: `${first} ${last}`,
      gender: isFemale ? "female" : "male",
      facultyAbbr,
      year,
      level: chance(0.85) ? "bachelor" : "master",
      city,
      verified: chance(0.65),
      pro: chance(0.12) ? "paid" : chance(0.18) ? "earned" : "none",
      bio,
    });
  }

  // Llogari kompanie.
  const companyFaculty = faculties.get("EKO")!;
  const companyUser = await db.user.create({
    data: {
      email: "kfc@kompani.studentet.ks",
      passwordHash,
      username: "kfc.kosova",
      name: "KFC Kosova",
      bio: "Llogari kompanie. Shpallje pune dhe oferta për studentë.",
      universityId: companyFaculty.universityId,
      facultyId: null,
      role: "company",
      isVerified: true,
      emailVerified: hoursAgo(500),
      onboardedAt: hoursAgo(500),
      demoLabel: "company",
      interests: "[]",
      createdAt: hoursAgo(4000),
    },
  });

  console.log(`  ${users.length + 1} përdorues`);

  const byLabel = (label: string) => users.find((user) => user.demoLabel === label)!;
  const arian = byLabel("free-new");
  const erza = byLabel("free-verified");
  const dea = byLabel("pro-earned");
  const rina = byLabel("free-rich-xp");
  const endrit = byLabel("course-leader");

  // 4. Grupet ----------------------------------------------------------------
  console.log("Grupet...");
  const courseGroups = new Map<string, string>();
  for (const course of courses) {
    const group = await db.group.create({
      data: {
        name: course.name,
        nameEn: course.name,
        type: "course",
        courseId: course.id,
        privacy: "public",
        description: `Kanali i lëndës ${course.name}. Materialet, pyetjet dhe provimet e kaluara janë këtu.`,
        facultyKey: course.facultyColor,
      },
    });
    courseGroups.set(course.id, group.id);
  }

  const generationGroups = new Map<string, string>();
  for (const [abbr, faculty] of faculties) {
    for (let year = 1; year <= 4; year += 1) {
      const label = `${faculty.name.replace("Fakulteti i ", "").replace("Fakulteti ", "")}, viti ${YEAR_ROMAN[year - 1]}`;
      const group = await db.group.create({
        data: {
          name: label,
          nameEn: label,
          type: "generation",
          privacy: "public",
          description: "Gjenerata jote. Njoftimet, afatet dhe pyetjet e përditshme.",
          facultyKey: faculty.color,
        },
      });
      generationGroups.set(`${abbr}-${year}`, group.id);
    }
  }

  for (const user of users) {
    for (const courseId of user.courseIds) {
      const groupId = courseGroups.get(courseId);
      if (groupId) await db.groupMember.create({ data: { groupId, userId: user.id } });
    }
    const generationId = generationGroups.get(`${user.facultyAbbr}-${user.year}`);
    if (generationId) await db.groupMember.create({ data: { groupId: generationId, userId: user.id } });
  }

  // 5. Grafi social ----------------------------------------------------------
  console.log("Grafi social...");
  const edges = new Set<string>();
  for (const user of users) {
    if (user.demoLabel === "free-new") continue; // Ariani nis pa asnjë ndjekje.

    const sameGeneration = users.filter(
      (other) => other.id !== user.id && other.facultyAbbr === user.facultyAbbr && other.year === user.year,
    );
    const sameFaculty = users.filter(
      (other) => other.id !== user.id && other.facultyAbbr === user.facultyAbbr,
    );
    const anyone = users.filter((other) => other.id !== user.id);

    const targets = [
      ...pickMany(sameGeneration, Math.min(sameGeneration.length, between(4, 9))),
      ...pickMany(sameFaculty, Math.min(sameFaculty.length, between(2, 5))),
      ...pickMany(anyone, between(1, 4)),
    ];

    for (const target of targets) {
      const key = `${user.id}:${target.id}`;
      if (edges.has(key)) continue;
      edges.add(key);
      await db.follow.create({
        // Ndjekjet e demos janë të pranuara: kërkesat provohen te rrjedha e vërtetë.
        data: {
          followerId: user.id,
          followingId: target.id,
          status: "accepted",
          respondedAt: new Date(),
          createdAt: hoursAgo(between(1, 3000)),
        },
      });
    }
  }

  for (const key of edges) {
    const [a, b] = key.split(":");
    if (edges.has(`${b}:${a}`)) {
      await db.follow.updateMany({ where: { followerId: a, followingId: b }, data: { isMutual: true } });
    }
  }
  console.log(`  ${edges.size} ndjekje`);

  // 6. Materialet ------------------------------------------------------------
  console.log("Materialet...");
  const materials: { id: string; facultyAbbr: string; courseId: string; title: string }[] = [];
  const types = ["script", "notes", "past_exam", "solved", "slides", "lecture", "book", "video"];

  for (let index = 0; index < 120; index += 1) {
    const course = pick(courses);
    const eligible = users.filter((user) => user.facultyAbbr === course.facultyAbbr);
    const uploader = eligible.length > 0 ? pick(eligible) : pick(users);
    const type = pick(types);
    const year = pick(["2023", "2024", "2025"]);

    const title = pick(MATERIAL_TITLES[type])
      .replace("{lenda}", course.name)
      .replace("{vit}", year)
      .replace("{prof}", course.professor.replace(/^Prof\.\s*(Dr\.|Ass\.)?\s*/, "Prof. "))
      .replace("{sem}", String(course.semester));

    const ratingCount = between(0, 24);
    const rating = ratingCount === 0 ? 0 : Math.round((3.2 + random() * 1.8) * 10) / 10;
    const verified = ratingCount >= 3 && rating >= 3.5;

    const material = await db.material.create({
      data: {
        uploaderId: uploader.id,
        courseId: course.id,
        title,
        type,
        fileUrl: `/materialet/${course.code.toLowerCase()}-${index}.pdf`,
        fileHash: hash(`${course.code}-${index}-${title}`),
        mimeType: type === "video" ? "video/mp4" : "application/pdf",
        size: between(240, 24000) * 1024,
        pages: type === "video" ? null : between(6, 180),
        professor: course.professor,
        academicYear: `${year}/${Number(year) + 1 - 2000}`,
        description: pick(MATERIAL_DESCRIPTIONS),
        rating,
        ratingCount,
        downloads: between(4, 640),
        verificationStatus: verified ? "verified" : "pending",
        rewardedAt: verified ? hoursAgo(between(2, 2000)) : null,
        createdAt: hoursAgo(between(2, 4000)),
      },
    });
    materials.push({ id: material.id, facultyAbbr: course.facultyAbbr, courseId: course.id, title });

    if (verified) {
      await db.xpTransaction.create({
        data: {
          userId: uploader.id,
          kind: "contribution",
          amount: 50,
          reason: "material_approved",
          targetId: material.id,
        },
      });
    }

    for (const rater of pickMany(users.filter((user) => user.id !== uploader.id), Math.min(ratingCount, 10))) {
      await db.materialRating.create({
        data: {
          materialId: material.id,
          userId: rater.id,
          value: rating >= 4 ? between(4, 5) : between(3, 5),
        },
      });
    }

    // Copëza me embedding, që asistenti të ketë çfarë të citojë. Vektori vjen nga
    // i njëjti funksion që përdor kërkesa, ndryshe kozinusi do të ishte pa kuptim.
    //
    // Titulli dhe përshkrimi vetëm e emërtojnë materialin, nuk e shpjegojnë. Pa
    // përmbajtjen e vërtetë të lëndës asistenti nuk ka çfarë të përgjigjet, dhe
    // rikthimi kthen çfarëdo materiali që përplaset rastësisht në hash.
    const notes = courseNotes(course.name);
    const header = `${title}. ${material.description ?? ""} Lënda ${course.name}, ${course.professor}.`;
    const pieces = chunkText(notes ? `${header} ${notes}` : header);

    for (const [index, piece] of pieces.entries()) {
      await db.materialEmbedding.create({
        data: {
          materialId: material.id,
          chunk: index,
          content: piece,
          vector: serializeVector(embed(piece)),
        },
      });
    }
  }

  // 6a. Stories ---------------------------------------------------------------
  console.log("Stories...");
  const STORY_CAPTIONS = [
    "Biblioteka sot, radhë e gjatë te kati i tretë.",
    "Kafja e parë para Statistikës.",
    "Laboratori i ri sapo u hap.",
    "Përgatitje për afatin, dita e katërt.",
    "Turneu i futsallit nis në ora 18:00.",
    "Sallat e reja të leximit janë të hapura deri në 22:00.",
    "Prezantimi mbaroi, faleminderit për pyetjet.",
    "Grupi i studimit mblidhet te kafeteria.",
  ];
  const STORY_SCOPES = ["year", "faculty", "followers", "close"];

  /*
    Storjet e demos janë vizatime, jo skedarë që nuk ekzistojnë.

    Dikur këtu ruhej `/stories/emri-0.jpg`, një rrugë pa skedar prapa: shfletuesi
    merrte 404 dhe storja dilte e zezë, sikur ngarkimi të ishte prishur. Një SVG
    i vogël brenda vetë adresës shfaqet gjithmonë, dhe duket qartë se është demo.
  */
  const STORY_COLORS = [
    ["#382dd4", "#1b1150"],
    ["#0e7490", "#052e34"],
    ["#be123c", "#4c0519"],
    ["#15803d", "#052e16"],
    ["#a16207", "#3b2006"],
  ];

  const storyImage = (index: number) => {
    const [from, to] = STORY_COLORS[index % STORY_COLORS.length];
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="960">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/>` +
      `</linearGradient></defs><rect width="540" height="960" fill="url(#g)"/></svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  for (const author of pickMany(users, 14)) {
    for (let index = 0; index < between(1, 3); index += 1) {
      const hoursAgo = between(1, 20);
      const story = await db.story.create({
        data: {
          authorId: author.id,
          kind: "image",
          mediaUrl: storyImage(index + author.username.length),
          caption: pick(STORY_CAPTIONS),
          scope: pick(STORY_SCOPES),
          createdAt: new Date(Date.now() - hoursAgo * 3_600_000),
          expiresAt: new Date(Date.now() + (24 - hoursAgo) * 3_600_000),
        },
      });

      // Disa i ka parë dikush, që rendi "te pashikuarat te parat" te jete i dukshem.
      for (const viewer of pickMany(users.filter((user) => user.id !== author.id), between(0, 4))) {
        await db.storyView.create({ data: { storyId: story.id, userId: viewer.id } });
      }
    }
  }

  // 6a-2. Dosjet e storjeve --------------------------------------------------
  // Çdo llogari demo ka tri dosje, «me», «place» dhe «friends», me storje të
  // vjetra me ngjyra. Storjet kanë skaduar, prandaj dalin vetëm te dosjet.
  console.log("Dosjet e storjeve...");
  const HIGHLIGHT_COLORS: Record<string, [string, string][]> = {
    me: [["#f97316", "#7c2d12"], ["#ec4899", "#500724"], ["#a855f7", "#3b0764"]],
    place: [["#0ea5e9", "#082f49"], ["#14b8a6", "#042f2e"], ["#84cc16", "#1a2e05"], ["#eab308", "#422006"]],
    friends: [["#f43f5e", "#4c0519"], ["#6366f1", "#1e1b4b"], ["#22c55e", "#052e16"]],
  };
  const colorStory = ([from, to]: [string, string]) =>
    `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="960">` +
        `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
        `<stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/>` +
        `</linearGradient></defs><rect width="540" height="960" fill="url(#g)"/></svg>`,
    )}`;
  const demoNames = new Set(DEMO_USERS.map((demo) => demo.name));
  for (const owner of users.filter((user) => demoNames.has(user.name))) {
    let daysBack = 40;
    for (const [position, [title, colors]] of Object.entries(HIGHLIGHT_COLORS).entries()) {
      const storyIds: string[] = [];
      for (const color of colors) {
        daysBack -= 1;
        const createdAt = new Date(Date.now() - daysBack * 86_400_000);
        const story = await db.story.create({
          data: {
            authorId: owner.id,
            kind: "image",
            mediaUrl: colorStory(color),
            scope: "followers",
            createdAt,
            expiresAt: new Date(createdAt.getTime() + 86_400_000),
          },
        });
        storyIds.push(story.id);
      }
      await db.storyHighlight.create({
        data: {
          userId: owner.id,
          title,
          position,
          items: { create: storyIds.map((storyId, index) => ({ storyId, position: index })) },
        },
      });
    }
  }

  // 6b. Tabela e njoftimeve --------------------------------------------------
  console.log("Njoftimet e tabeles...");
  const fiek = faculties.get("FIEK");
  const announcementSeeds = [
    {
      title: "Afati i dytë i regjistrimit mbyllet të premten",
      titleEn: "The second registration round closes on Friday",
      body: "Dorëzimi i dokumenteve bëhet online, deri në orën 16:00.",
      bodyEn: "Documents are submitted online, until 16:00.",
      priority: 2,
      deadline: new Date(Date.now() + 4 * 86_400_000),
      facultyId: null as string | null,
      kind: "notice",
      eventAt: null as Date | null,
      place: null as string | null,
    },
    {
      title: "Udhëtim në Rugovë me Studentët.KS",
      titleEn: "Trip to Rugova with Studentët.KS",
      body: "Ecje deri te Liqeni i Kuqërrit dhe drekë bashkë. 40 vende, transporti i përfshirë.",
      bodyEn: "A hike to Kuqërrit Lake and lunch together. 40 seats, transport included.",
      priority: 1,
      deadline: null,
      facultyId: null as string | null,
      kind: "trip",
      eventAt: new Date(Date.now() + 9 * 86_400_000 + 8 * 3_600_000) as Date | null,
      place: "Qendra Studentore, Prishtinë" as string | null,
    },
    {
      title: "Mbrëmja e studentëve të vitit të parë",
      titleEn: "First year students' night",
      body: "Muzikë, lojëra dhe njohje me studentët e viteve të tjera. Hyrja falas me llogari të verifikuar.",
      bodyEn: "Music, games and meeting students from other years. Free entry with a verified account.",
      priority: 1,
      deadline: null,
      facultyId: null as string | null,
      kind: "event",
      eventAt: new Date(Date.now() + 5 * 86_400_000) as Date | null,
      place: "Salla e Kuqe, Prishtinë" as string | null,
    },
    {
      title: "Takim për vullnetarët e platformës",
      titleEn: "Meetup for platform volunteers",
      body: "Po kërkojmë studentë që duan të ndihmojnë me moderimin dhe eventet e semestrit.",
      bodyEn: "We're looking for students who want to help with moderation and this semester's events.",
      priority: 0,
      deadline: null,
      facultyId: null as string | null,
      kind: "meetup",
      eventAt: new Date(Date.now() + 3 * 86_400_000) as Date | null,
      place: "Biblioteka Kombëtare" as string | null,
    },
    {
      title: "Java e karrierës, 12 deri 16 maj",
      titleEn: "Career week, 12 to 16 May",
      body: "Njëzet kompani, intervista të drejtpërdrejta dhe punëtori CV-je.",
      bodyEn: "Twenty companies, interviews on the spot and CV workshops.",
      priority: 1,
      deadline: null,
      facultyId: null as string | null,
      kind: "event",
      eventAt: null as Date | null,
      place: null as string | null,
    },
    {
      title: "Laboratori i rrjetave mbyllet për mirëmbajtje",
      titleEn: "The networks lab closes for maintenance",
      body: "Ushtrimet e së mërkurës zhvendosen në sallën 302.",
      bodyEn: "Wednesday exercises move to room 302.",
      priority: 0,
      deadline: null,
      facultyId: fiek?.id ?? null,
      kind: "notice",
      eventAt: null as Date | null,
      place: null as string | null,
    },
  ];

  for (const seed of announcementSeeds) {
    await db.announcement.create({
      data: {
        title: seed.title,
        titleEn: seed.titleEn,
        body: seed.body,
        bodyEn: seed.bodyEn,
        priority: seed.priority,
        deadline: seed.deadline,
        kind: seed.kind,
        eventAt: seed.eventAt,
        place: seed.place,
        facultyId: seed.facultyId,
        isActive: true,
        startsAt: new Date(Date.now() - 86_400_000),
        endsAt: new Date(Date.now() + 30 * 86_400_000),
      },
    });
  }

  // 6c. Bursat ----------------------------------------------------------------
  console.log("Bursat...");
  const SCHOLARSHIPS = [
    {
      title: "Bursa e Qeverisë së Kosovës për studime master",
      provider: "Ministria e Arsimit",
      description:
        "Mbulon tarifën e studimit dhe një shtesë mujore për studentët me rezultate të larta.",
      amountCents: 250000,
      country: "Kosove",
      field: "Të gjitha fushat",
      level: "master",
      eligibility: "Mesatare mbi 8.5 dhe letër motivimi.",
    },
    {
      title: "Erasmus+ shkëmbim semestral",
      provider: "Zyra e Bashkëpunimit Ndërkombëtar",
      description: "Një semestër në një universitet partner, me bursë udhëtimi dhe jetese.",
      amountCents: 90000,
      country: "Bashkimi Evropian",
      field: "Të gjitha fushat",
      level: "any",
      eligibility: "Viti i dytë e tutje, anglisht B2.",
    },
    {
      title: "Bursa për gra në teknologji",
      provider: "Fondacioni Kosovar për Teknologji",
      description: "Mbështetje për studentët e FIEK dhe të informatikës, plus mentorim.",
      amountCents: 120000,
      country: "Kosove",
      field: "Teknologji",
      level: "bachelor",
      eligibility: "Studente të vitit të dytë ose të tretë.",
    },
    {
      title: "Bursa e ekselencës në mjekësi",
      provider: "Spitali Universitar",
      description: "Për studentët e mjekësisë që punojnë në kërkim klinik.",
      amountCents: 180000,
      country: "Kosove",
      field: "Mjekesi",
      level: "any",
      eligibility: "Rekomandim nga një profesor i fakultetit.",
    },
    {
      title: "Bursa DAAD për studime në Gjermani",
      provider: "DAAD",
      description: "Studime të plota master në universitetet gjermane.",
      amountCents: 850000,
      country: "Gjermani",
      field: "Inxhinieri dhe shkenca",
      level: "master",
      eligibility: "Gjermanisht B1 ose anglisht C1.",
    },
    {
      title: "Bursa lokale për studentët e Prizrenit",
      provider: "Komuna e Prizrenit",
      description: "Mbështetje vjetore për studentët nga komuna, pavarësisht fakultetit.",
      amountCents: 60000,
      country: "Kosove",
      field: "Të gjitha fushat",
      level: "bachelor",
      eligibility: "Banor i komunës dhe student i rregullt.",
    },
  ];

  for (const [index, seed] of SCHOLARSHIPS.entries()) {
    await db.scholarship.create({
      data: {
        ...seed,
        deadline: new Date(Date.now() + (7 + index * 11) * 86_400_000),
        link: "https://example.org/bursa",
        isActive: true,
      },
    });
  }

  // 6d. Kurset online ---------------------------------------------------------
  console.log("Kurset online...");
  const professorUsers = users.filter((user) => user.role === "professor");
  const createdCourses = [];
  for (const [index, seed] of ONLINE_COURSES.entries()) {
    const instructor = professorUsers[index % Math.max(1, professorUsers.length)] ?? users[0];

    const course = await db.onlineCourse.create({
      data: {
        instructorId: instructor.id,
        title: seed.title,
        subtitle: seed.subtitle,
        description: seed.description,
        category: seed.category,
        level: seed.level,
        priceCents: seed.priceCents,
        language: "sq",
        status: "published",
        publishedAt: hoursAgo(between(200, 2000)),
        facultyId: instructor.facultyId ?? null,
      },
    });
    createdCourses.push({ ...course, instructorId: instructor.id });

    for (const [sectionIndex, sectionSeed] of seed.sections.entries()) {
      const section = await db.courseSection.create({
        data: { courseId: course.id, title: sectionSeed.title, order: sectionIndex },
      });

      for (const [lessonIndex, lesson] of sectionSeed.lessons.entries()) {
        await db.lesson.create({
          data: {
            sectionId: section.id,
            title: lesson.title,
            kind: lesson.kind,
            content: lesson.kind === "quiz" ? JSON.stringify(lesson.questions) : lesson.body,
            duration: lesson.kind === "text" ? lesson.minutes * 60 : null,
            isPreview: lesson.kind === "text" && Boolean(lesson.preview),
            order: lessonIndex,
          },
        });
      }
    }

    // Shitjet: çdo regjistrim me pagese shkruan një rresht te libri.
    const buyers = pickMany(
      users.filter((user) => user.id !== instructor.id),
      seed.priceCents === 0 ? between(8, 20) : between(3, 9),
    );

    for (const buyer of buyers) {
      await db.courseEnrollment.create({
        data: {
          courseId: course.id,
          userId: buyer.id,
          source: seed.priceCents === 0 ? "free" : "payment",
          createdAt: hoursAgo(between(1, 900)),
        },
      });

      if (seed.priceCents > 0) {
        // E njejta ndarje si te lib/billing/ledger.ts: 70 instruktori, 30 platforma.
        const instructorCents = Math.floor(seed.priceCents * 0.7);
        await db.ledgerEntry.create({
          data: {
            courseId: course.id,
            buyerId: buyer.id,
            instructorId: instructor.id,
            kind: "sale",
            grossCents: seed.priceCents,
            platformCents: seed.priceCents - instructorCents,
            instructorCents,
            currency: "EUR",
            createdAt: hoursAgo(between(1, 900)),
          },
        });
      }

      // Disa e vleresojne kursin.
      if (random() > 0.6) {
        await db.courseReview.create({
          data: {
            courseId: course.id,
            userId: buyer.id,
            stars: between(4, 5),
            comment: pick([
              "Shumë i qartë, sidomos pjesa e dytë.",
              "Më ndihmoi para provimit.",
              "Shembujt janë realistë, jo të shpikur.",
              "Do ta rekomandoja për vitin e dytë.",
            ]),
          },
        });
      }
    }

    const aggregate = await db.courseReview.aggregate({
      where: { courseId: course.id },
      _avg: { stars: true },
      _count: { stars: true },
    });
    await db.onlineCourse.update({
      where: { id: course.id },
      data: { rating: aggregate._avg.stars ?? 0, ratingCount: aggregate._count.stars },
    });
  }

  // Një kërkesë terheqjeje ne pritje, që paneli i adminit te këtë çfarë te tregoje.
  if (professorUsers[0]) {
    const balance = await db.ledgerEntry.aggregate({
      where: { instructorId: professorUsers[0].id, kind: "sale" },
      _sum: { instructorCents: true },
    });
    if ((balance._sum.instructorCents ?? 0) > 5000) {
      await db.payout.create({
        data: {
          instructorId: professorUsers[0].id,
          amountCents: balance._sum.instructorCents ?? 0,
          status: "requested",
        },
      });
    }
  }

  // 6e. Studio bashke ---------------------------------------------------------
  console.log("Studio bashke...");
  const STUDY_SEEDS = [
    { title: "Po mbyll Algoritmet, kapitulli 4", place: "Biblioteka e FIEK, kati i dytë" },
    { title: "Përsëritje për Statistikë", place: "Kafeteria e Fakultetit Ekonomik" },
    { title: "Anatomi, sistemi nervor", place: "Salla e leximit, Fakulteti i Mjekësisë" },
    { title: "Ushtrime për Kimi organike", place: "Laboratori 3, FSHMN" },
    { title: "Përgatitje për kolokuiumin e së drejtës civile", place: "Biblioteka Kombëtare" },
    { title: "Grup për Bazat e të dhënave", place: "Innovation Centre Kosovo" },
  ];

  for (const [index, seed] of STUDY_SEEDS.entries()) {
    const author = pick(users);
    const session = await db.studyTogether.create({
      data: {
        authorId: author.id,
        title: seed.title,
        place: seed.place,
        startsAt: new Date(Date.now() + (index * 6 + between(2, 20)) * 3_600_000),
        capacity: chance(0.5) ? between(4, 10) : null,
        courseId: author.courseIds[0] ?? null,
      },
    });

    await db.studyTogetherJoin.create({ data: { sessionId: session.id, userId: author.id } });

    for (const joiner of pickMany(
      users.filter((user) => user.id !== author.id),
      between(1, 5),
    )) {
      await db.studyTogetherJoin.create({ data: { sessionId: session.id, userId: joiner.id } });
    }
  }

  // 7. Pyetjet ---------------------------------------------------------------
  console.log("Pyetjet...");
  for (let index = 0; index < 60; index += 1) {
    const course = pick(courses);
    const eligible = users.filter((user) => user.facultyAbbr === course.facultyAbbr);
    const author = eligible.length > 0 ? pick(eligible) : pick(users);

    const question = await db.question.create({
      data: {
        authorId: author.id,
        courseId: course.id,
        title: pick(QUESTION_TITLES),
        text: pick(QUESTION_BODIES),
        views: between(6, 420),
        createdAt: hoursAgo(between(1, 2000)),
      },
    });

    const answerers = pickMany(
      users.filter((user) => user.id !== author.id),
      index % 2 === 0 ? between(1, 4) : between(0, 2),
    );
    const answerIds: string[] = [];

    for (const answerer of answerers) {
      const votes = between(0, 28);
      const answer = await db.answer.create({
        data: {
          questionId: question.id,
          authorId: answerer.id,
          text: pick(ANSWER_TEXTS),
          votes,
          createdAt: hoursAgo(between(1, 1800)),
        },
      });
      answerIds.push(answer.id);

      if (votes >= 5) {
        await db.xpTransaction.create({
          data: {
            userId: answerer.id,
            kind: "contribution",
            amount: 20,
            reason: "answer_votes",
            targetId: answer.id,
          },
        });
      }
    }

    if (index % 2 === 0 && answerIds.length > 0) {
      await db.question.update({
        where: { id: question.id },
        data: { acceptedAnswerId: answerIds[0] },
      });
      const accepted = await db.answer.update({
        where: { id: answerIds[0] },
        data: { rewardedAt: new Date() },
      });
      await db.xpTransaction.create({
        data: {
          userId: accepted.authorId,
          kind: "contribution",
          amount: 40,
          reason: "answer_accepted",
          targetId: accepted.id,
        },
      });
    }
  }

  // 8. Eventet, kompanitë, punët ---------------------------------------------
  console.log("Eventet, punët dhe reklamat...");
  const events = [];
  for (let index = 0; index < 30; index += 1) {
    const seed = EVENT_SEEDS[index % EVENT_SEEDS.length];
    const creator = pick(users);
    const isPast = index >= 24;

    const event = await db.event.create({
      data: {
        creatorId: creator.id,
        title: index < EVENT_SEEDS.length ? seed.title : `${seed.title}, edicioni ${Math.floor(index / EVENT_SEEDS.length) + 1}`,
        description: seed.description,
        date: isPast ? hoursAgo(between(48, 700)) : daysFromNow(between(0, 45), between(9, 20)),
        location: seed.location,
        facultyId: creator.facultyId,
        kind: seed.kind,
        createdAt: hoursAgo(between(24, 900)),
      },
    });
    events.push(event);

    for (const attendee of pickMany(users, between(4, 26))) {
      await db.rsvp.create({
        data: { eventId: event.id, userId: attendee.id, status: chance(0.78) ? "going" : "maybe" },
      });
    }
  }

  const JOB_REQUIREMENTS = [
    "Student i vitit të dytë ose më lart. Njohuri bazë të fushës dhe gatishmëri për të mësuar. Anglishtja e nevojshme për literaturën.",
    "Përvojë me projekte studentore ose personale. Nuk kërkohet përvojë pune. Disponueshmëri 20 orë në javë.",
    "Aftësi komunikimi me shkrim dhe me gojë. Puna bëhet në ekip të vogël. Orari është fleksibil rreth ligjëratave.",
    "Njohuri të mira të Excel-it. Saktësi me numra dhe afate. Përparësi kanë studentët e vitit të tretë e lart.",
  ];

  const JOB_SKILLS = [
    "Excel", "SQL", "JavaScript", "Python", "Figma", "Komunikim",
    "Anglisht", "Gjermanisht", "Analizë të dhënash", "Punë në ekip",
    "Menaxhim kohe", "Marketing", "Shkrim", "Kontabilitet",
  ];

  const JOB_SALARIES = [
    "300 deri 450 euro në muaj",
    "Praktikë e paguar, 250 euro në muaj",
    "Sipas marrëveshjes",
    "500 deri 700 euro në muaj",
  ];

  const companies = [];
  for (const company of COMPANIES) companies.push(await db.company.create({ data: company }));

  for (const job of JOB_SEEDS) {
    await db.jobPost.create({
      data: {
        companyId: pick(companies).id,
        title: job.title,
        type: job.type,
        field: job.field,
        city: job.city,
        isRemote: job.remote,
        description: job.description,
        // Kerkesat dhe pagesa nuk i ka çdo shpallje, as ne jeten reale. Sirtari e
        // fsheh seksionin që mungon, prandaj këtu mbushen vetëm disa.
        requirements: chance(0.7) ? pick(JOB_REQUIREMENTS) : null,
        skills: serializeList(pickMany(JOB_SKILLS, between(2, 5))),
        salary: chance(0.35) ? pick(JOB_SALARIES) : null,
        deadline: daysFromNow(between(3, 70), 23),
        link: chance(0.6) ? "https://konkurse.example/aplikimi" : null,
        createdAt: hoursAgo(between(2, 700)),
      },
    });
  }

  for (const advertiser of ADVERTISERS) {
    const created = await db.advertiser.create({
      data: { name: advertiser.name, contact: `kontakt@${slug(advertiser.name)}.example` },
    });
    for (const ad of advertiser.ads) {
      await db.ad.create({
        data: {
          advertiserId: created.id,
          ...ad,
          targeting: JSON.stringify({}),
          endsAt: daysFromNow(between(30, 180)),
          priority: between(1, 10),
          budgetCents: between(20000, 200000),
        },
      });
    }
  }

  // 9. Postimet --------------------------------------------------------------
  console.log("Foto demonstruese...");
  const seedMedia = await buildSeedMedia();
  for (const item of seedMedia) {
    await db.mediaAsset.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        ownerId: users[0].id,
        kind: item.kind,
        extension: item.extension,
        mime: item.mime,
        bytes: item.bytes,
        width: item.width,
        height: item.height,
        durationMs: item.durationMs,
      },
    });
  }

  console.log("Tregu...");
  const LISTINGS = [
    { title: "Mikroekonomia, Mankiw, botimi i 8-të", category: "books", condition: "like_new", price: 1800, city: "Prishtinë", description: "E kam përdorur një semestër, pa shënime brenda. Kopertina ka një gërvishtje të vogël." },
    { title: "Shënime të plota për Anatominë I", category: "notes", condition: "used", price: 500, city: "Prishtinë", description: "Të shkruara me dorë dhe të skanuara, me skema për çdo kapitull. Mund t'i marrësh edhe të printuara." },
    { title: "Kalkulator Casio fx-991ES Plus", category: "electronics", condition: "used", price: 1200, city: "Prishtinë", description: "Punon pa asnjë problem, me kapak. E lejuar në provimet e FIEK dhe Ekonomikut." },
    { title: "Dhomë në banesë me dy studente, afër Qendrës Studentore", category: "housing", condition: "used", price: 13000, city: "Prishtinë", description: "Dhomë e mobiluar, rryma dhe interneti të përfshira. E lirë nga 1 tetori. Preferohen studente." },
    { title: "Tavolinë pune dhe karrige", category: "furniture", condition: "used", price: 3500, city: "Prizren", description: "Tavolinë 120 cm me sirtar dhe karrige e rregullueshme. Duhet t'i marrësh vetë." },
    { title: "Mësime private në Matematikë 1", category: "services", condition: "new", price: 800, city: "Prishtinë", description: "Student i vitit të katërt në FIEK. Një orë, në bibliotekë ose online. Përgatitje për kolokviume." },
    { title: "Libra të Drejtës Civile, tre vëllime", category: "books", condition: "used", price: 2500, city: "Pejë", description: "Të tre vëllimet bashkë. Ka nënvizime me laps në vëllimin e parë." },
    { title: "Laptop Lenovo ThinkPad T480", category: "electronics", condition: "used", price: 32000, city: "Prishtinë", description: "i5, 16 GB RAM, 512 GB SSD. Bateria mban rreth katër orë. Me karikues." },
    { title: "Po fal librat e vitit të parë të Mjekësisë", category: "books", condition: "used", price: null, city: "Gjilan", description: "Mbarova vitin e parë dhe nuk më duhen më. Eja merri te Fakulteti i Mjekësisë." },
    { title: "Rregullim CV-je dhe letre motivimi", category: "services", condition: "new", price: 1000, city: "Prishtinë", description: "Të ndihmoj ta shkruash CV-në në shqip ose anglisht dhe ta përshtatësh për praktikën që po aplikon." },
    { title: "Llambë tavoline LED", category: "furniture", condition: "like_new", price: 900, city: "Ferizaj", description: "Tre nivele drite, porta USB për karikim. Përdorur pak." },
    { title: "Provime të kaluara të Statistikës me zgjidhje", category: "notes", condition: "used", price: 300, city: "Prishtinë", description: "Afatet nga 2021 deri 2024, me zgjidhje hap pas hapi. Në PDF." },
    { title: "Kufje me anulim zhurme", category: "electronics", condition: "like_new", price: 6000, city: "Mitrovicë", description: "Të mira për bibliotekë. Në kutinë origjinale, me kabllo." },
    { title: "Kërkoj shoqe dhome për semestrin e dytë", category: "housing", condition: "used", price: 11000, city: "Prizren", description: "Banesë me dy dhoma afër Universitetit Ukshin Hoti. Pjesa ime e qirasë." },
    { title: "Vizatim teknik, set i plotë", category: "other", condition: "used", price: 1500, city: "Prishtinë", description: "Vizore, kompas, rapidografë dhe tabelë A3. Për studentët e Arkitekturës." },
    { title: "Biçikletë qyteti", category: "other", condition: "used", price: 7000, city: "Pejë", description: "E rregulluar këtë verë, me drita dhe kyç. Ideale për të shkuar në fakultet." },
  ];

  for (const [index, item] of LISTINGS.entries()) {
    const seller = users[(index * 7 + 3) % users.length];
    await db.marketListing.create({
      data: {
        sellerId: seller.id,
        title: item.title,
        description: item.description,
        priceCents: item.price,
        category: item.category,
        condition: item.condition,
        city: item.city,
        media: item.category === "services" ? "[]" : serializeMedia(pickMany<SeededMedia>(seedMedia, between(1, 3)).map(toMediaRef)),
        status: index === 11 ? "sold" : "active",
        universityId: seller.universityId,
        createdAt: hoursAgo(between(2, 500)),
      },
    });
  }

  console.log("Postimet...");
  let pollIndex = 0;

  for (let index = 0; index < 250; index += 1) {
    const author = pick(users);
    const authorCourses = author.courseIds;
    const course = authorCourses.length > 0 ? courses.find((item) => item.id === pick(authorCourses)) : undefined;

    const roll = random();
    const type =
      roll < 0.38 ? "text"
      : roll < 0.52 ? "question"
      : roll < 0.66 ? "material"
      : roll < 0.74 ? "poll"
      : roll < 0.83 ? "event"
      : roll < 0.92 ? "seek"
      : "campus_voice";

    // Shtrirjet e gjëra janë të rralla, sepse kërkojnë Pro.
    const scopeRoll = random();
    const scope =
      type === "campus_voice" ? "faculty"
      : scopeRoll < 0.6 ? "faculty"
      : scopeRoll < 0.75 ? "followers"
      : scopeRoll < 0.92 ? "university"
      : "national";

    let text = pick(TEXT_POSTS);
    let materialId: string | null = null;
    let eventId: string | null = null;

    if (type === "question") text = `${pick(QUESTION_TITLES)} ${pick(QUESTION_BODIES)}`;
    else if (type === "material") {
      const own = materials.filter((item) => item.facultyAbbr === author.facultyAbbr);
      const material = own.length > 0 ? pick(own) : pick(materials);
      materialId = material.id;
      text = `E ngarkova: ${material.title}. ${pick(MATERIAL_DESCRIPTIONS)}`;
    } else if (type === "event") {
      const event = pick(events);
      eventId = event.id;
      text = `${event.title}, ${event.location}. Kush vjen?`;
    } else if (type === "seek") text = pick(SEEK_POSTS);
    else if (type === "campus_voice") text = pick(CAMPUS_VOICE_POSTS);
    else if (type === "poll") text = POLL_SEEDS[pollIndex % POLL_SEEDS.length].text;

    const post = await db.post.create({
      data: {
        authorId: author.id,
        type,
        text,
        scope,
        courseId: chance(0.3) ? (course?.id ?? null) : null,
        facultyId: author.facultyId,
        universityId: author.universityId,
        materialId,
        eventId,
        isAnonymous: type === "campus_voice",
        pseudonym: type === "campus_voice" ? `Studenti #${between(1, 99)}` : null,
        media:
          type === "campus_voice" || !chance(0.28)
            ? "[]"
            : serializeMedia(pickMany<SeededMedia>(seedMedia, between(1, 4)).map(toMediaRef)),
        createdAt: hoursAgo(Math.floor(random() ** 2 * 720) + 1),
      },
    });

    if (type === "poll") {
      const seed = POLL_SEEDS[pollIndex % POLL_SEEDS.length];
      pollIndex += 1;
      const options = [];
      for (let optionIndex = 0; optionIndex < seed.options.length; optionIndex += 1) {
        options.push(
          await db.pollOption.create({
            data: { postId: post.id, text: seed.options[optionIndex], order: optionIndex },
          }),
        );
      }
      for (const voter of pickMany(users, between(6, 40))) {
        await db.pollVote.create({
          data: { postId: post.id, optionId: pick(options).id, userId: voter.id },
        });
      }
    }

    // Materialet dhe pyetjet mbledhin më shumë "E dobishme", të tjerat më shumë pëlqime.

    const reactors = pickMany(users.filter((user) => user.id !== author.id), between(0, 30));
    for (const reactor of reactors) {
      await db.reaction.create({
        data: {
          userId: reactor.id,
          postId: post.id,
          type: "like",
          createdAt: hoursAgo(between(1, 400)),
        },
      });
    }

    const commenters = pickMany(users.filter((user) => user.id !== author.id), between(0, 5));
    for (const commenter of commenters) {
      await db.comment.create({
        data: {
          postId: post.id,
          authorId: commenter.id,
          text: pick(COMMENTS),
          createdAt: hoursAgo(between(1, 300)),
        },
      });
    }

    await db.post.update({
      where: { id: post.id },
      data: {
        likeCount: reactors.length,
        commentCount: commenters.length,
        saveCount: between(0, 18),
      },
    });
  }

  // 10. Bisedat --------------------------------------------------------------
  console.log("Bisedat dhe njoftimet...");
  const MESSAGES = [
    "Hej, a i ke shënimet e ligjëratës së fundit?",
    "I kam, po t'i dërgoj tash.",
    "Faleminderit shumë, m'u desh urgjent.",
    "A po vjen nesër në bibliotekë? Fillojmë në dhjetë.",
    "Po, po vij. Sille edhe fletën e ushtrimeve.",
    "E kalova provimin. Falë atyre skemave që i ngarkove.",
    "Urime. E dija që do ta kalosh.",
    "Po e nis projektin sonte. Nëse ke kohë, hidhi një sy pjesës së parë.",
  ];

  const mutuals = await db.follow.findMany({ where: { isMutual: true }, take: 80 });
  const seen = new Set<string>();

  for (const follow of mutuals) {
    const key = [follow.followerId, follow.followingId].sort().join(":");
    if (seen.has(key) || seen.size > 34) continue;
    seen.add(key);

    const conversation = await db.conversation.create({
      data: { type: "direct", createdAt: hoursAgo(between(2, 900)), updatedAt: hoursAgo(between(0, 100)) },
    });
    await db.conversationMember.createMany({
      data: [
        { conversationId: conversation.id, userId: follow.followerId },
        { conversationId: conversation.id, userId: follow.followingId },
      ],
    });

    const count = between(2, 8);
    for (let index = 0; index < count; index += 1) {
      await db.message.create({
        data: {
          conversationId: conversation.id,
          authorId: index % 2 === 0 ? follow.followerId : follow.followingId,
          text: MESSAGES[index % MESSAGES.length],
          createdAt: hoursAgo(between(1, 200) + (count - index) * 2),
        },
      });
    }
  }

  // Erza dhe Dea duhet të kenë biseda pa i kërkuar.
  for (const anchor of [erza, dea]) {
    for (const friend of pickMany(users.filter((user) => user.id !== anchor.id), 3)) {
      await db.follow.createMany({
        data: [
          { followerId: anchor.id, followingId: friend.id, isMutual: true, status: "accepted" },
          { followerId: friend.id, followingId: anchor.id, isMutual: true, status: "accepted" },
        ],
      }).catch(() => undefined);

      const conversation = await db.conversation.create({
        data: { type: "direct", updatedAt: hoursAgo(between(1, 40)) },
      });
      await db.conversationMember.createMany({
        data: [
          { conversationId: conversation.id, userId: anchor.id },
          { conversationId: conversation.id, userId: friend.id },
        ],
      });
      for (let index = 0; index < 4; index += 1) {
        await db.message.create({
          data: {
            conversationId: conversation.id,
            authorId: index % 2 === 0 ? friend.id : anchor.id,
            text: MESSAGES[index % MESSAGES.length],
            createdAt: hoursAgo(20 - index * 3),
          },
        });
      }
    }
  }

  // Një grup studimi, që bisedat në grup të shihen që në hyrjen e parë.
  const groupMembers = [erza, dea, ...pickMany(users.filter((user) => user.id !== erza.id && user.id !== dea.id), 4)];
  const studyGroup = await db.conversation.create({
    data: { type: "group", title: "Grupi i Statistikës", updatedAt: hoursAgo(2) },
  });
  await db.conversationMember.createMany({
    // Erza e krijoi grupin, prandaj është admini i tij.
    data: groupMembers.map((member) => ({ conversationId: studyGroup.id, userId: member.id, role: member.id === erza.id ? "admin" : "member" })),
  });
  const GROUP_MESSAGES = [
    "A e ka dikush zgjidhjen e detyrës 4 nga ushtrimet?",
    "E kam deri te pjesa b, pastaj ngeca.",
    "Te b duhet me përdor intervalin e besimit 95 për qind, jo 99.",
    "Aha, tash po del. Faleminderit!",
    "Nesër në 10 takohemi në bibliotekë para kolokviumit?",
    "Po, unë vij.",
  ];
  for (const [index, text] of GROUP_MESSAGES.entries()) {
    await db.message.create({
      data: {
        conversationId: studyGroup.id,
        authorId: groupMembers[(index + 2) % groupMembers.length].id,
        text,
        createdAt: hoursAgo(12 - index * 2),
      },
    });
  }

  // 11. Badge-t, XP dhe njoftimet -------------------------------------------
  const leader = badges.get("course_leader")!;
  const algorithms = courses.find((course) => course.name === "Algoritme")!;
  await db.userBadge.create({
    data: {
      userId: endrit.id,
      badgeId: leader.id,
      context: algorithms.name,
      expiresAt: daysFromNow(120),
    },
  });

  for (const user of users) {
    if (chance(0.3)) {
      await db.userBadge.create({ data: { userId: user.id, badgeId: badges.get("founder")!.id } }).catch(() => undefined);
    }
    if (chance(0.2)) {
      await db.userBadge.create({ data: { userId: user.id, badgeId: badges.get("savior")!.id } }).catch(() => undefined);
    }
    if (chance(0.12)) {
      await db.userBadge.create({ data: { userId: user.id, badgeId: badges.get("archivist")!.id } }).catch(() => undefined);
    }
  }

  await db.xpTransaction.create({
    data: { userId: rina.id, kind: "contribution", amount: 3400, reason: "material_approved", note: "Bilanc i grumbulluar" },
  });

  // Kodet voucher, të shitura nga ambasadorët.
  for (let index = 0; index < 12; index += 1) {
    await db.voucher.create({
      data: {
        code: `STUD-${String(index + 1).padStart(3, "0")}-${between(1000, 9999)}`,
        days: pick([30, 30, 30, 150]),
        batch: "ambasadoret-2026",
      },
    });
  }

  // Dyzet njoftime për llogarinë demo kryesore.
  const notificationSeeds: { category: string; type: string; payload: Record<string, string | number> }[] = [
    { category: "social", type: "follow", payload: { shared: 3 } },
    { category: "social", type: "mutual", payload: {} },
    { category: "social", type: "comment", payload: { excerpt: "E provova dhe funksionoi." } },
    { category: "social", type: "reaction", payload: { others: 3 } },
    { category: "social", type: "mention", payload: {} },
    { category: "social", type: "message", payload: {} },
    { category: "academic", type: "material_new", payload: { course: "Algoritme" } },
    { category: "academic", type: "material_approved", payload: { xp: 50, days: 7 } },
    { category: "academic", type: "material_milestone", payload: { downloads: 100, xp: 30 } },
    { category: "academic", type: "question_new", payload: { course: "Struktura të dhënash" } },
    { category: "academic", type: "answer_new", payload: {} },
    { category: "academic", type: "answer_accepted", payload: { xp: 40, days: 1 } },
    { category: "academic", type: "lecture_soon", payload: { course: "Bazat e të dhënave", time: "10:00" } },
    { category: "academic", type: "exam_soon", payload: { course: "Rrjeta kompjuterike", days: 3 } },
    { category: "academic", type: "event_new", payload: { faculty: "FIEK" } },
    { category: "progress", type: "streak_risk", payload: { streak: 6 } },
    { category: "progress", type: "level_up", payload: { level: "noteCarrier" } },
    { category: "progress", type: "badge_new", payload: { badge: "archivist" } },
    { category: "progress", type: "pro_earned", payload: { days: 7 } },
    { category: "progress", type: "xp_enough", payload: { days: 30 } },
    { category: "progress", type: "pro_expiring", payload: { days: 3 } },
    { category: "jobs", type: "job_match", payload: { field: "Teknologji" } },
    { category: "jobs", type: "job_deadline", payload: { title: "Praktikant në zhvillim softueri" } },
    { category: "system", type: "report_resolved", payload: {} },
    { category: "system", type: "terms_updated", payload: {} },
  ];

  const actors = pickMany(users.filter((user) => user.id !== dea.id), 12);
  for (let index = 0; index < 40; index += 1) {
    const seed = notificationSeeds[index % notificationSeeds.length];
    await db.notification.create({
      data: {
        userId: dea.id,
        category: seed.category,
        type: seed.type,
        actorId: seed.category === "system" || seed.category === "progress" ? null : actors[index % actors.length].id,
        payload: JSON.stringify(seed.payload),
        groupKey: seed.type === "reaction" ? "reaction:demo" : null,
        isRead: index > 8,
        createdAt: hoursAgo(index * 5 + 1),
      },
    });
  }

  // Ariani duhet ta shohë gjendjen boshe, prandaj merr vetëm një njoftim.
  await db.notification.create({
    data: {
      userId: arian.id,
      category: "system",
      type: "welcome",
      payload: JSON.stringify({}),
      createdAt: hoursAgo(50),
    },
  });

  // 12. Moderimi -------------------------------------------------------------
  const reportable = await db.post.findMany({ take: 8, orderBy: { createdAt: "desc" } });
  for (const post of reportable.slice(0, 5)) {
    await db.report.create({
      data: {
        reporterId: pick(users).id,
        targetId: post.id,
        targetType: "post",
        reason: pick(["spam", "harassment", "personal_data", "other"]),
        note: "E raportova sepse s'më duket në rregull për këtë kanal.",
        status: chance(0.5) ? "open" : "reviewing",
        createdAt: hoursAgo(between(1, 90)),
      },
    });
  }

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() || 7) - 1));
  weekStart.setHours(0, 0, 0, 0);
  for (let week = 0; week < 4; week += 1) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() - week * 7);
    await db.moderationLog.create({
      data: { weekOf: date, removed: between(4, 19), reviewed: between(20, 60), dismissed: between(5, 25) },
    });
  }

  // 13. Një bisedë demo me asistentin ---------------------------------------
  const conversation = await db.aiConversation.create({
    data: { userId: dea.id, title: "Histori e artit para provimit", mode: "chat" },
  });
  await db.aiMessage.createMany({
    data: [
      {
        conversationId: conversation.id,
        role: "user",
        content: "Më shpjego thjesht ndryshimin mes barokut dhe rokokosë.",
      },
      {
        conversationId: conversation.id,
        role: "assistant",
        content:
          "Baroku është i rëndë dhe dramatik: kontraste të forta drite, lëvizje, tema fetare. Rokokoja vjen pas tij dhe e zbut gjithçka: ngjyra të lehta, dekor i imët, tema laike dhe intime. Nëse baroku bërtet, rokokoja pëshpërit.",
        sourceIds: "[]",
        tokensIn: 42,
        tokensOut: 96,
        costMicros: 180,
      },
    ],
  });

  const counts = {
    universitete: await db.university.count(),
    fakultete: await db.faculty.count(),
    lende: await db.course.count(),
    perdorues: await db.user.count(),
    postime: await db.post.count(),
    materiale: await db.material.count(),
    pyetje: await db.question.count(),
    pergjigje: await db.answer.count(),
    evente: await db.event.count(),
    pune: await db.jobPost.count(),
    reklama: await db.ad.count(),
    badge: await db.badge.count(),
    grupe: await db.group.count(),
    biseda: await db.conversation.count(),
    njoftime: await db.notification.count(),
    kode: await db.voucher.count(),
    stories: await db.story.count(),
    bursa: await db.scholarship.count(),
    kurse: await db.onlineCourse.count(),
    studioBashke: await db.studyTogether.count(),
    shitje: await db.ledgerEntry.count({ where: { kind: "sale" } }),
  };

  console.log("Gati:", counts);
  console.log("Hyr me çdo llogari demo, fjalëkalimi: provoje123");
  console.log("Pronari: petrit.cana, fjalëkalimi: 12341234 (admin, Pro)");
  console.log(`  ${companyUser.email} · llogari kompanie`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
