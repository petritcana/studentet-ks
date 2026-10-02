import { db, parseList } from "@/lib/db";
import { canViewMaterial, type AccessUser } from "@/lib/access";
import { levelLabelKey, levelFor } from "@/lib/xp";
import type { ProfileHeaderUser } from "@/components/profile/profile-header";
import { nameColorOf, profileThemeOf } from "@/lib/pro";
import { acceptedFollow, followStateOf } from "@/lib/follow";

/**
 * Profili publik.
 *
 * Emaili, telefoni dhe hash-i i fjalëkalimit nuk dalin kurrë. Postimet anonime
 * të një personi nuk shfaqen te profili i tij, sepse ndryshe anonimiteti do të
 * ishte vetëm dekor.
 */
export async function getProfile(username: string, locale: string) {
  const english = locale === "en";

  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      avatar: true,
      cover: true,
      bio: true,
      isVerified: true,
      isPrivate: true,
      year: true,
      role: true,
      city: true,
      createdAt: true,
      dailyStreak: true,
      xpContribution: true,
      xpActivity: true,
      proEarnedUntil: true,
      interests: true,
      proAccent: true,
      proCoverStyle: true,
      profileTheme: true,
      nameColor: true,
      university: { select: { abbr: true } },
      faculty: { select: { name: true, nameEn: true, color: true } },
      studyProgram: { select: { name: true, nameEn: true, degreeTitle: true } },
      specialization: { select: { name: true, nameEn: true } },
      campus: { select: { name: true } },
      subscriptions: { where: { status: "active" }, select: { status: true, expiresAt: true } },
      _count: {
        select: {
          followers: { where: acceptedFollow },
          following: { where: acceptedFollow },
          posts: true,
          materials: true,
        },
      },
      badges: {
        where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        orderBy: { earnedAt: "desc" },
        select: {
          badge: { select: { code: true, name: true, nameEn: true, description: true, descriptionEn: true, icon: true } },
        },
      },
    },
  });
  if (!user) return null;

  const friendCount = await db.follow.count({ where: { followerId: user.id, isMutual: true, ...acceptedFollow } });

  const now = new Date();
  const isPro =
    Boolean(user.proEarnedUntil && user.proEarnedUntil > now) ||
    user.subscriptions.some((item) => item.expiresAt > now);

  const level = levelFor(user.xpContribution + user.xpActivity);

  const header: ProfileHeaderUser = {
    id: user.id,
    name: user.name,
    username: user.username,
    avatar: user.avatar,
    cover: user.cover,
    proAccent: isPro ? user.proAccent : null,
    proCoverStyle: isPro ? user.proCoverStyle : null,
    // Dizajni dhe ngjyra e emrit shfaqen vetëm sa kohë pronari e ka Pro-në.
    profileTheme: isPro ? profileThemeOf(user.profileTheme) : null,
    nameColor: isPro ? nameColorOf(user.nameColor) : null,
    bio: user.bio,
    role: user.role,
    isVerified: user.isVerified,
    isPro,
    universityAbbr: user.university?.abbr ?? null,
    facultyCode: user.faculty?.color ?? null,
    facultyLabel: user.faculty ? (english ? user.faculty.nameEn : user.faculty.name) : null,
    programLabel: user.studyProgram
      ? english
        ? user.studyProgram.nameEn
        : user.studyProgram.name
      : null,
    degreeTitle: user.studyProgram?.degreeTitle ?? null,
    year: user.year,
    levelKey: levelLabelKey(level.key),
    isPrivate: user.isPrivate,
    followerCount: user._count.followers,
    followingCount: user._count.following,
    friendCount,
    postCount: user._count.posts,
    contributionXp: user.xpContribution,
  };

  return {
    header,
    stats: {
      posts: user._count.posts,
      materials: user._count.materials,
      streak: user.dailyStreak,
      memberSince: user.createdAt.toISOString(),
    },
    level: { key: level.key, progress: Math.round(level.percent) },
    interests: parseList(user.interests),
    badges: user.badges.map((row) => ({
      key: row.badge.code,
      label: english ? row.badge.nameEn : row.badge.name,
      description: english ? row.badge.descriptionEn : row.badge.description,
      icon: row.badge.icon,
    })),
  };
}

/** Materialet e ngarkuara nga një person, me vendimin e qasjes për shikuesin. */
export async function getProfileMaterials(
  viewer: AccessUser,
  uploaderId: string,
  locale: string,
) {
  const english = locale === "en";

  const materials = await db.material.findMany({
    where: { uploaderId, isHidden: false },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      type: true,
      rating: true,
      downloads: true,
      verificationStatus: true,
      isHidden: true,
      uploaderId: true,
      courseId: true,
      course: {
        select: {
          name: true,
          nameEn: true,
          department: {
            select: {
              facultyId: true,
              faculty: { select: { universityId: true, name: true, nameEn: true } },
            },
          },
        },
      },
    },
  });

  return materials.map((material) => ({
    id: material.id,
    title: material.title,
    type: material.type,
    rating: material.rating,
    downloads: material.downloads,
    verificationStatus: material.verificationStatus,
    courseName: english ? material.course.nameEn : material.course.name,
    facultyLabel: english
      ? material.course.department.faculty.nameEn
      : material.course.department.faculty.name,
    locked: !canViewMaterial(viewer, material).allowed,
  }));
}

export async function getRelationship(viewerId: string, targetId: string) {
  if (viewerId === targetId)
    return { following: false, requested: false, isFriend: false, followsYou: false, state: "none" as const };

  const [mine, theirs] = await Promise.all([
    db.follow.findUnique({
      where: { followerId_followingId: { followerId: viewerId, followingId: targetId } },
      select: { isMutual: true, status: true },
    }),
    db.follow.findUnique({
      where: { followerId_followingId: { followerId: targetId, followingId: viewerId } },
      select: { status: true },
    }),
  ]);

  const state = followStateOf(mine);

  return {
    following: state === "following" || state === "friends",
    requested: state === "pending",
    isFriend: state === "friends",
    followsYou: theirs?.status === "accepted",
    state,
  };
}

/**
 * Sa ndjekës të përbashkët kanë dy persona.
 *
 * Kjo është shenja më e fortë sociale që mund të japë një profil: jo se sa
 * ndjekës ka dikush, por se sa prej tyre i njeh ti. Prandaj llogaritet ndaj
 * ndjekësve të të dyve, jo ndaj atyre që ndjekin.
 */
export async function countMutualFollowers(viewerId: string, targetId: string): Promise<number> {
  const [mine, theirs] = await Promise.all([
    db.follow.findMany({ where: { followerId: viewerId, ...acceptedFollow }, select: { followingId: true } }),
    db.follow.findMany({ where: { followerId: targetId, ...acceptedFollow }, select: { followingId: true } }),
  ]);

  const seen = new Set(mine.map((row) => row.followingId));
  return theirs.filter((row) => seen.has(row.followingId)).length;
}
