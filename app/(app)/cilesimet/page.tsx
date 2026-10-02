import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EducationSettings } from "@/components/academic/education-settings";
import { ProfileImageEditor } from "@/components/profile/profile-image-editor";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { NotificationPrefs } from "@/components/settings/notification-prefs";
import { PasswordChange } from "@/components/settings/password-change";
import { ProSettings } from "@/components/pro/pro-settings";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [me, t] = await Promise.all([requireUser(), getTranslations("settings")]);

  // Arsimimi lexohet i plotë, që seksioni të tregojë emrat, jo id-të.
  const education = await db.user.findUnique({
    where: { id: me.id },
    select: {
      year: true,
      cohortYear: true,
      level: true,
      highSchool: true,
      previousCity: true,
      university: { select: { id: true, name: true } },
      campus: { select: { id: true, name: true } },
      faculty: { select: { id: true, name: true } },
      studyProgram: { select: { id: true, name: true, degreeTitle: true } },
      specialization: { select: { id: true, name: true } },
    },
  });

  // Preferencat e njoftimeve: mungesa e një rreshti do të thotë «po».
  const prefRows = await db.notificationSetting.findMany({
    where: { userId: me.id },
    select: { category: true, inApp: true },
  });
  const notificationPrefs = Object.fromEntries(prefRows.map((row) => [row.category, row.inApp]));

  const blocks = await db.userBlock.findMany({
    where: { blockerId: me.id },
    select: {
      kind: true,
      blocked: { select: { id: true, name: true, username: true } },
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text">{t("title")}</h1>
        <p className="measure text-sm text-text-muted">{t("subtitle")}</p>
      </header>

      <ProfileImageEditor
        avatar={me.avatar}
        cover={me.cover}
        name={me.name}
        bio={me.bio}
        gender={me.gender}
      />

      {/* Te profili, «⋯» → «Ndrysho password-in» të sjell drejt këtu (`#password`). */}
      <PasswordChange />

      <NotificationPrefs initial={notificationPrefs} />

      <ProSettings
        initial={{
          isPro: me.pro,
          accent: me.proAccent,
          coverStyle: me.proCoverStyle,
          featured: Boolean(me.featuredUntil && me.featuredUntil > new Date()),
          whoCanFollow: me.whoCanFollow,
          whoCanMessage: me.whoCanMessage,
        }}
      />

      <EducationSettings
        initial={{
          selection: {
            universityId: education?.university?.id ?? null,
            campusId: education?.campus?.id ?? null,
            level: education?.level ?? null,
            facultyId: education?.faculty?.id ?? null,
            studyProgramId: education?.studyProgram?.id ?? null,
            specializationId: education?.specialization?.id ?? null,
          },
          year: education?.year ?? null,
          cohortYear: education?.cohortYear ?? null,
          institutionName: education?.university?.name ?? null,
          campusName: education?.campus?.name ?? null,
          facultyName: education?.faculty?.name ?? null,
          programName: education?.studyProgram?.name ?? null,
          degreeTitle: education?.studyProgram?.degreeTitle ?? null,
          specializationName: education?.specialization?.name ?? null,
          level: education?.level ?? null,
          previousInstitution: education?.highSchool ?? "",
          previousCity: education?.previousCity ?? "",
        }}
      />

      <SettingsPanel
        user={{
          username: me.username,
          email: me.email,
          interests: me.interestList,
          pushEnabled: me.pushEnabled,
          emailDigest: me.emailDigest,
          showReadReceipts: me.showReadReceipts,
          showOnlineStatus: me.showOnlineStatus,
          showLastActive: me.showLastActive,
          analyticsConsent: me.analyticsConsent,
          isPrivate: me.isPrivate,
          autoAcceptFollows: me.autoAcceptFollows,
        }}
        blocked={blocks.map((block) => ({
          id: block.blocked.id,
          name: block.blocked.name,
          username: block.blocked.username,
          kind: block.kind,
        }))}
      />
    </div>
  );
}
