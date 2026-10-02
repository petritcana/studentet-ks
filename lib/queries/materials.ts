import { db } from "@/lib/db";
import { canViewMaterial, type AccessUser } from "@/lib/access";
import type { MaterialRowDto } from "@/components/materials/material-row";

export type MaterialFilters = {
  q?: string;
  courseId?: string;
  type?: string;
  scope?: "mine" | "faculty" | "all";
  ids?: string[];
  uploaderId?: string;
};

export async function getMaterials(
  user: AccessUser & { courseIds: string[] },
  filters: MaterialFilters,
  locale: string,
): Promise<MaterialRowDto[]> {
  const english = locale === "en";

  const where = {
    isHidden: false,
    ...(filters.q ? { title: { contains: filters.q } } : {}),
    ...(filters.courseId ? { courseId: filters.courseId } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.ids ? { id: { in: filters.ids } } : {}),
    ...(filters.uploaderId ? { uploaderId: filters.uploaderId } : {}),
    ...(filters.scope === "mine" ? { courseId: { in: user.courseIds } } : {}),
    ...(filters.scope === "faculty" && user.facultyId
      ? { course: { department: { facultyId: user.facultyId } } }
      : {}),
  };

  const materials = await db.material.findMany({
    where,
    // Të verifikuarit dalin të parët, sepse cilësia është pika e shitjes.
    orderBy: [{ verificationStatus: "asc" }, { rating: "desc" }, { createdAt: "desc" }],
    take: 60,
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
    locked: !canViewMaterial(user, material).allowed,
  }));
}

/** Një material i vetëm, me vendimin e qasjes dhe arsyen e tij. */
export async function getMaterial(user: AccessUser, materialId: string, locale: string) {
  const english = locale === "en";

  const material = await db.material.findUnique({
    where: { id: materialId },
    select: {
      id: true,
      title: true,
      type: true,
      pages: true,
      size: true,
      rating: true,
      ratingCount: true,
      downloads: true,
      professor: true,
      academicYear: true,
      description: true,
      verificationStatus: true,
      isHidden: true,
      uploaderId: true,
      courseId: true,
      createdAt: true,
      course: {
        select: {
          id: true,
          name: true,
          nameEn: true,
          department: {
            select: {
              facultyId: true,
              faculty: {
                select: { universityId: true, name: true, nameEn: true, color: true },
              },
            },
          },
        },
      },
      uploader: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          isVerified: true,
          year: true,
          proEarnedUntil: true,
          university: { select: { abbr: true } },
          faculty: { select: { name: true, nameEn: true, color: true } },
          subscriptions: { where: { status: "active" }, select: { status: true, expiresAt: true } },
        },
      },
      ratings: {
        where: { userId: user.id },
        select: { value: true },
      },
    },
  });
  if (!material) return null;

  const decision = canViewMaterial(user, material);

  return {
    ...material,
    access: decision,
    courseName: english ? material.course.nameEn : material.course.name,
    facultyLabel: english
      ? material.course.department.faculty.nameEn
      : material.course.department.faculty.name,
    facultyCode: material.course.department.faculty.color,
    myRating: material.ratings[0]?.value ?? null,
  };
}

/** Materiale të ngjashme: e njëjta lëndë, i njëjti lloj, jo vetë materiali. */
export async function getRelatedMaterials(
  user: AccessUser,
  material: { id: string; courseId: string; type: string },
  locale: string,
): Promise<MaterialRowDto[]> {
  const english = locale === "en";

  const related = await db.material.findMany({
    where: { courseId: material.courseId, id: { not: material.id }, isHidden: false },
    orderBy: { rating: "desc" },
    take: 5,
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

  return related.map((item) => ({
    id: item.id,
    title: item.title,
    type: item.type,
    rating: item.rating,
    downloads: item.downloads,
    verificationStatus: item.verificationStatus,
    courseName: english ? item.course.nameEn : item.course.name,
    facultyLabel: english
      ? item.course.department.faculty.nameEn
      : item.course.department.faculty.name,
    locked: !canViewMaterial(user, item).allowed,
  }));
}
