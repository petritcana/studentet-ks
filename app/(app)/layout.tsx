import { Suspense } from "react";
import { AppChrome } from "@/components/layout/app-chrome";
import { CampusSpace, CampusSpaceSkeleton } from "@/components/layout/campus-space";
import { DbProbe } from "@/components/shared/db-probe";
import { assistantLabel } from "@/lib/ai/models";
import { allowedScopes } from "@/lib/access";
import { isDemoMode } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

/** Çelësat e etiketave demo, të njëjtët si te `/demo`. */
const DEMO_LABEL_KEYS: Record<string, string> = {
  "free-new": "labelFreeNew",
  "free-verified": "labelFreeVerified",
  "pro-paid": "labelProPaid",
  "pro-earned": "labelProEarned",
  "free-rich-xp": "labelFreeRichXp",
  "course-leader": "labelCourseLeader",
  moderator: "labelModerator",
  admin: "labelAdmin",
  company: "labelCompany",
};

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();

  // Lëndët nuk merren me këtu: kompozuesi social nuk i përdor, sepse pyetjet dhe
  // materialet krijohen aty ku kane kuptim, jo nga ballina.
  // Dy numëruesit shkojnë bashkë me një udhëtim; llogaritë demo merren vetëm kur
  // demoja është e ndezur, prandaj rrinë jashtë grupit.
  // Numrat e shtyllës: çfarë është e re këtë javë te Materialet (fakulteti yt) dhe te Karriera.
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const [[unreadNotifications, pendingRequests, unreadMessages, newMaterials, newJobs], demoAccounts] = await Promise.all([
    db.$transaction([
      // Kërkesat e ndjekjes hyjnë te shenja e ziles: janë vendim që pret dikë.
      db.notification.count({ where: { userId: me.id, isRead: false } }),
      db.follow.count({ where: { followingId: me.id, status: "pending" } }),
      db.conversationMember.count({
        where: {
          userId: me.id,
          // Bisedat e heshtura nuk e ndezin numrin te shiriti.
          OR: [{ mutedUntil: null }, { mutedUntil: { lt: new Date() } }],
          conversation: { messages: { some: { authorId: { not: me.id } } } },
        },
      }),
      db.material.count({
        where: {
          verificationStatus: "verified",
          isHidden: false,
          createdAt: { gte: weekAgo },
          uploaderId: { not: me.id },
          ...(me.facultyId ? { course: { department: { facultyId: me.facultyId } } } : {}),
        },
      }),
      db.jobPost.count({ where: { createdAt: { gte: weekAgo }, deadline: { gte: new Date() } } }),
    ]),
    isDemoMode
      ? db.user.findMany({
          where: { demoLabel: { not: null } },
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, demoLabel: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <AppChrome
      user={{
        id: me.id,
        name: me.name,
        username: me.username,
        avatar: me.avatar,
        role: me.access.role,
        isPro: me.pro,
        isVerified: me.isVerified,
        xp: me.xpContribution + me.xpActivity,
        // Llogaria e re vetëm shikon derisa admini ta miratojë ID-në.
        review: me.awaitingReview
          ? me.verification === "rejected"
            ? "rejected"
            : me.verification === "pending"
              ? "pending"
              : "missing"
          : null,
      }}
      scopeOptions={allowedScopes(me.access)}
      assistantLabel={assistantLabel()}
      sidebar={
        // Kufiri i vet: punët vijnë të transmetuara, dhe pa të hidratimi i shtyllës
        // herë pas here gjente HTML tjetër nga ai që priste (React #418).
        <Suspense fallback={<CampusSpaceSkeleton />}>
          <CampusSpace user={{ id: me.id, facultyId: me.facultyId, city: me.city }} />
        </Suspense>
      }
      unreadNotifications={unreadNotifications + pendingRequests}
      unreadMessages={unreadMessages}
      navCounts={{ "/materialet": newMaterials, "/karriera": newJobs }}
      demo={
        isDemoMode && me.demoLabel
          ? {
              accounts: demoAccounts.map((account) => ({
                id: account.id,
                name: account.name,
                labelKey: DEMO_LABEL_KEYS[account.demoLabel ?? ""] ?? "labelFreeNew",
              })),
              proOverride: me.proOverride,
            }
          : null
      }
    >
      {children}
      <DbProbe path="app" />
    </AppChrome>
  );
}
