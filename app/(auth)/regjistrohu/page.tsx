import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { OnboardingWizard } from "@/components/auth/onboarding-wizard";
import { CodeStep, IdStep, StudentEmailStep, type SignupStep } from "@/components/auth/signup-steps";
import { StudentRegister } from "@/components/auth/student-register";
import { WelcomeScreen } from "@/components/auth/welcome-screen";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isGoogleEnabled } from "@/lib/auth";
import { db } from "@/lib/db";
import { activeStudentCode, CODE_RESEND_SECONDS, institutionForEmail, peekDevCode } from "@/lib/registration";
import { getCurrentUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("registerCta"), description: t("registerBody") };
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ftesa?: string; me?: string }>;
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

    const inviterName = invite && !invite.usedAt ? invite.inviter.name : undefined;
    const t = await getTranslations("authFlow");

    // «Vazhdo me email studentor»: emri, mbiemri, data e lindjes, emaili, password-i.
    if (params.me === "email") {
      return (
        <div className="mx-auto w-full max-w-[540px] px-5 pb-16 pt-8 min-[560px]:pt-12">
          <Link
            href={inviteCode ? `/regjistrohu?ftesa=${inviteCode}` : "/regjistrohu"}
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-brand-500 hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t("backToStart")}
          </Link>
          <StudentRegister inviteCode={inviteCode} inviterName={inviterName} />
        </div>
      );
    }

    return (
      <div className="mx-auto w-full max-w-[500px] px-5 pb-16 pt-8 min-[560px]:pt-14">
        <WelcomeScreen
          googleEnabled={isGoogleEnabled}
          emailHref={inviteCode ? `/regjistrohu?me=email&ftesa=${inviteCode}` : "/regjistrohu?me=email"}
          inviterName={inviterName}
        />
      </div>
    );
  }

  // Kush erdhi nga Google pa password të platformës e vendos atë së pari.
  if (!user.hasPassword) redirect("/regjistrohu/llogaria");

  /*
    Hapat e regjistrimit, me radhë: emaili studentor i provuar me kod, pastaj
    fotoja e ID-së, pastaj profili akademik. Faqja e gjen vetë ku ka mbetur
    studenti, që një rifreskim ose një kthim më vonë ta çojë në vendin e duhur.
  */
  const t = await getTranslations("authFlow");
  const fromGoogle = (await db.account.count({ where: { userId: user.id, provider: "google" } })) > 0;
  const verification = await db.verification.findFirst({
    where: { userId: user.id, kind: "student" },
    orderBy: { createdAt: "desc" },
    select: { status: true, idDocumentRef: true, rejectedReason: true },
  });
  const idSent = Boolean(verification?.idDocumentRef) || user.verification === "verified";
  const needsId = user.awaitingReview && !idSent;

  // Vetëm llogaritë e reja kalojnë nga emaili dhe ID-ja; të vjetrat vazhdojnë te profili.
  const stage = user.awaitingReview && !user.studentEmail ? "email" : needsId ? "id" : "profile";
  const order = fromGoogle
    ? (["google", "email", "id", "profile"] as const)
    : (["details", "email", "id", "profile"] as const);
  const labels = {
    google: t("stepGoogle"),
    details: t("stepDetails"),
    email: t("stepCode"),
    id: t("stepId"),
    profile: t("stepProfile"),
  };
  const current = order.indexOf(stage);
  const steps: SignupStep[] = order.map((key, index) => ({
    label: labels[key],
    state: index < current ? "done" : index === current ? "current" : "todo",
  }));

  const frame = (children: ReactNode) => (
    <div className="mx-auto w-full max-w-[540px] px-5 pb-16 pt-8 min-[560px]:pt-12">{children}</div>
  );

  if (stage === "email") {
    const active = await activeStudentCode(user.id);
    if (active) {
      const elapsed = Math.floor((Date.now() - active.createdAt.getTime()) / 1000);
      return frame(
        <CodeStep
          steps={steps}
          email={active.email}
          devCode={peekDevCode(user.id)}
          resendIn={Math.max(0, CODE_RESEND_SECONDS - elapsed)}
        />,
      );
    }
    return frame(
      <StudentEmailStep steps={steps} loginEmail={user.email} needsBirth={!user.birthDate} fromGoogle={fromGoogle} />,
    );
  }

  if (stage === "id") {
    return frame(
      <IdStep
        steps={steps}
        rejectedReason={verification?.status === "rejected" ? (verification.rejectedReason ?? "") : null}
      />,
    );
  }

  // Institucioni del nga emaili studentor: studenti nuk e zgjedh dot një tjetër.
  const institution = await institutionForEmail(user.studentEmail);

  /*
    Katalogu nuk vjen me faqen.

    Dikur këtu shkarkohej tërë pema e universiteteve me fakultete, departamente
    dhe lëndë, vetëm që studenti të zgjidhte një emër. Tani hapat e marrin
    listën e tyre nga `/api/akademia`, prandaj faqja niset menjëherë.
  */
  const step = !user.universityId && !institution
    ? 2
    : !user.studyProgramId
      ? 3
      : !user.year
        ? 4
        : 5;

  return (
    <OnboardingWizard
      initial={{
        step,
        name: user.name,
        avatar: user.avatar,
        gender: user.gender,
        bio: user.bio ?? "",
        city: user.city ?? "",
        highSchool: user.highSchool ?? "",
        universityId: user.universityId ?? institution?.id ?? null,
        lockedUniversityId: institution?.id ?? null,
        campusId: user.campusId,
        facultyId: user.facultyId,
        studyProgramId: user.studyProgramId,
        specializationId: user.specializationId,
        year: user.year,
      }}
    />
  );
}
