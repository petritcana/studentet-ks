import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingWizard, type WizardUniversity } from "@/components/auth/onboarding-wizard";
import { RegisterForm } from "@/components/auth/register-form";
import { isGoogleEnabled } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Regjistrohu",
  description:
    "Nis llogarinë tënde. Nëntë hapa dhe del me orarin, materialet dhe njerëzit e gjeneratës sate.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ftesa?: string }>;
}) {
  const user = await getCurrentUser();
  if (user?.onboardedAt) redirect("/feed");

  const params = await searchParams;
  const inviteCode = params.ftesa?.toUpperCase();

  if (!user) {
    const invite = inviteCode
      ? await db.invite.findUnique({
          where: { code: inviteCode },
          select: { usedAt: true, inviter: { select: { name: true } } },
        })
      : null;

    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <RegisterForm
          googleEnabled={isGoogleEnabled}
          inviteCode={inviteCode}
          inviterName={invite && !invite.usedAt ? invite.inviter.name : undefined}
        />
      </div>
    );
  }

  const universities = await db.university.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      abbr: true,
      city: true,
      faculties: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          color: true,
          icon: true,
          departments: {
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              courses: {
                orderBy: [{ year: "asc" }, { semester: "asc" }, { name: "asc" }],
                select: {
                  id: true,
                  name: true,
                  code: true,
                  year: true,
                  semester: true,
                  ects: true,
                  professor: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const enrollments = await db.enrollment.findMany({
    where: { userId: user.id },
    select: { courseId: true },
  });

  const step = !user.universityId
    ? 2
    : !user.facultyId
      ? 3
      : !user.year
        ? 4
        : enrollments.length === 0
          ? 5
          : 6;

  return (
    <OnboardingWizard
      universities={universities as WizardUniversity[]}
      initial={{
        step,
        name: user.name,
        bio: user.bio ?? "",
        city: user.city ?? "",
        highSchool: user.highSchool ?? "",
        universityId: user.universityId,
        facultyId: user.facultyId,
        departmentId: user.departmentId,
        year: user.year,
        level: user.level,
        interests: user.interestList,
        courseIds: enrollments.map((item) => item.courseId),
      }}
    />
  );
}
