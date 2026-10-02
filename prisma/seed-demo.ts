// Dhjetë studentë demo për faqen publike, që feed-i dhe hapi i njerëzve të mos jenë bosh.
//
// Fjalëkalimi vjen nga DEMO_PASSWORD, kurrë i shkruar në kod. Të gjithë janë studentë të
// zakonshëm, pa rol admini ose moderatori. Nëse ekzistojnë, skripti nuk bën asgjë.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ACADEMIC_YEAR } from "../lib/types";
import { COMMENTS, TEXT_POSTS } from "./seed-data";

const db = new PrismaClient();

const DOMAIN = "demo.studentet-ks.app";

const PEOPLE = [
  { name: "Arian Bytyqi", gender: "male", username: "arian.bytyqi", faculty: "FIEK", year: 1, city: "Gjilan" },
  { name: "Erza Krasniqi", gender: "female", username: "erza.krasniqi", faculty: "MJK", year: 3, city: "Prishtinë" },
  { name: "Blerim Gashi", gender: "male", username: "blerim.gashi", faculty: "EKO", year: 1, city: "Prishtinë" },
  { name: "Dea Morina", gender: "female", username: "dea.morina", faculty: "ART", year: 2, city: "Pejë" },
  { name: "Rina Ahmeti", gender: "female", username: "rina.ahmeti", faculty: "FSHMN", year: 2, city: "Ferizaj" },
  { name: "Endrit Rexhepi", gender: "male", username: "endrit.rexhepi", faculty: "FIEK", year: 3, city: "Prishtinë" },
  { name: "Vlora Berisha", gender: "female", username: "vlora.berisha", faculty: "JUR", year: 4, city: "Prizren" },
  { name: "Fisnik Hoxha", gender: "male", username: "fisnik.hoxha", faculty: "EKO", year: 4, city: "Prishtinë" },
  { name: "Albina Shala", gender: "female", username: "albina.shala", faculty: "FIL", year: 2, city: "Mitrovicë" },
  { name: "Driton Kelmendi", gender: "male", username: "driton.kelmendi", faculty: "FIEK", year: 2, city: "Gjakovë" },
] as const;

const ROMAN = ["I", "II", "III", "IV"];

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 3_600_000);
}

async function main() {
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 10) {
    throw new Error("seed-demo: vendos DEMO_PASSWORD, të paktën 10 shenja.");
  }

  if ((await db.user.count({ where: { email: { endsWith: `@${DOMAIN}` } } })) > 0) {
    console.log("seed-demo: përdoruesit demo ekzistojnë, s'ka çfarë të shtohet.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const users: { id: string; facultyId: string; universityId: string }[] = [];

  for (const [index, person] of PEOPLE.entries()) {
    const faculty = await db.faculty.findFirst({
      where: { abbr: person.faculty, university: { abbr: "UP" } },
      select: { id: true, universityId: true },
    });
    if (!faculty) throw new Error(`seed-demo: mungon fakulteti ${person.faculty}. Nis seed-base më parë.`);

    const user = await db.user.create({
      data: {
        email: `${person.username}@${DOMAIN}`,
        username: person.username,
        name: person.name,
        gender: person.gender,
        passwordHash,
        bio: `${person.faculty}, viti ${ROMAN[person.year - 1]}. Nga ${person.city}.`,
        city: person.city,
        year: person.year,
        level: "bachelor",
        universityId: faculty.universityId,
        facultyId: faculty.id,
        interests: "[]",
        emailVerified: hoursAgo(400),
        onboardedAt: hoursAgo(400 - index),
        createdAt: hoursAgo(400 - index),
      },
    });
    users.push({ id: user.id, facultyId: faculty.id, universityId: faculty.universityId });

    const courses = await db.course.findMany({
      where: { department: { facultyId: faculty.id }, year: { lte: person.year } },
      select: { id: true },
      take: 5,
    });
    for (const course of courses) {
      await db.enrollment.create({
        data: { userId: user.id, courseId: course.id, academicYear: ACADEMIC_YEAR },
      });
    }
  }

  // Të gjithë e ndjekin njëri-tjetrin, pra janë shokë.
  for (const follower of users) {
    for (const following of users) {
      if (follower.id === following.id) continue;
      await db.follow.create({
        data: { followerId: follower.id, followingId: following.id, status: "accepted" },
      });
    }
  }

  // Dy postime secili, të dukshme për të gjithë, dhe disa komente.
  let postCount = 0;
  for (const [index, author] of users.entries()) {
    for (let round = 0; round < 2; round += 1) {
      const text = TEXT_POSTS[(index * 2 + round) % TEXT_POSTS.length];
      const createdAt = hoursAgo(2 + index * 5 + round * 37);
      const post = await db.post.create({
        data: {
          authorId: author.id,
          type: "text",
          text,
          scope: "national",
          facultyId: author.facultyId,
          universityId: author.universityId,
          createdAt,
        },
      });
      postCount += 1;

      const commenters = [users[(index + 1) % users.length], users[(index + 3) % users.length]];
      const comments = round === 0 ? commenters : commenters.slice(0, 1);
      for (const [offset, commenter] of comments.entries()) {
        await db.comment.create({
          data: {
            postId: post.id,
            authorId: commenter.id,
            text: COMMENTS[(index + round + offset) % COMMENTS.length],
            createdAt: new Date(createdAt.getTime() + (offset + 1) * 1_200_000),
          },
        });
      }
      await db.post.update({ where: { id: post.id }, data: { commentCount: comments.length } });
    }
  }

  console.log(`seed-demo: ${users.length} studentë, ${postCount} postime.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
