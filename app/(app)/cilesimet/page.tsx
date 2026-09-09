import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import {
  BlockedPanel,
  CoursesPanel,
  DataPanel,
  InterestsPanel,
  PreferencesPanel,
  ProfilePanel,
} from "@/components/settings/settings-panels";
import { LanguagePanel } from "@/components/settings/language-panel";
import { SignOutButton } from "@/components/settings/sign-out-button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Cilësimet",
  description: "Profili, lëndët, njoftimet, privatësia dhe të dhënat e tua.",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();

  const [courses, enrollments, blocked] = await Promise.all([
    user.facultyId
      ? db.course.findMany({
          where: {
            department: { facultyId: user.facultyId },
            ...(user.year ? { year: user.year } : {}),
          },
          select: { id: true, name: true, code: true, year: true, semester: true },
          orderBy: [{ semester: "asc" }, { name: "asc" }],
        })
      : Promise.resolve([]),
    db.enrollment.findMany({
      where: { userId: user.id },
      select: { courseId: true },
    }),
    db.userBlock.findMany({
      where: { blockerId: user.id },
      select: {
        kind: true,
        blocked: { select: { id: true, name: true, username: true, avatar: true } },
      },
    }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Cilësimet"
        description="Gjithçka që mund ta ndryshosh, në një vend."
      />

      <ProfilePanel
        initial={{
          name: user.name,
          username: user.username,
          bio: user.bio ?? "",
          city: user.city ?? "",
          highSchool: user.highSchool ?? "",
          avatar: user.avatar,
        }}
      />

      <CoursesPanel
        courses={courses}
        selected={enrollments.map((item) => item.courseId)}
      />

      <InterestsPanel selected={user.interestList} />

      <LanguagePanel />

      <PreferencesPanel
        initial={{
          showReadReceipts: user.showReadReceipts,
          pushEnabled: user.pushEnabled,
          analyticsConsent: user.analyticsConsent,
        }}
      />

      <BlockedPanel
        blocked={blocked.map((item) => ({
          id: item.blocked.id,
          name: item.blocked.name,
          username: item.blocked.username,
          avatar: item.blocked.avatar,
          kind: item.kind,
        }))}
      />

      <DataPanel />

      <Card className="flex flex-col gap-3 p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-text">Llogaria</h2>
        <p className="text-xs text-text-muted">
          Emaili yt është <span className="font-mono text-text">{user.email}</span>. Nuk shfaqet
          kurrë publikisht dhe nuk kthehet në asnjë përgjigje të API-t.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/privatesia" className="text-brand-500 hover:underline">
            Politika e privatësisë
          </Link>
          <Link href="/kushtet" className="text-brand-500 hover:underline">
            Kushtet e përdorimit
          </Link>
          <Link href="/moderimi/publik" className="text-brand-500 hover:underline">
            Raporti i moderimit
          </Link>
        </div>
        <SignOutButton />
      </Card>
    </div>
  );
}
