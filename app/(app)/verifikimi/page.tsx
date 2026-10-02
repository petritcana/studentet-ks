import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CodeStep, IdStep, StudentEmailStep } from "@/components/auth/signup-steps";
import { VerificationStatus } from "@/components/verification/verification-flow";
import { db } from "@/lib/db";
import { activeStudentCode, CODE_RESEND_SECONDS, peekDevCode } from "@/lib/registration";
import { requireAccount } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("verify");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/**
 * Verifikimi: emaili studentor me kod, pastaj fotoja e ID-së, pastaj vendimi i
 * moderimit. Të njëjtat hapa si te regjistrimi, që një llogari e vjetër ta marrë
 * shenjën dhe një llogari e refuzuar ta dërgojë prapë foton.
 */
export default async function VerificationPage() {
  const [me, t] = await Promise.all([requireAccount(), getTranslations("verify")]);

  const record = await db.verification.findFirst({
    where: { userId: me.id, kind: "student" },
    orderBy: { createdAt: "desc" },
    select: { status: true, idDocumentRef: true, rejectedReason: true },
  });

  let body: ReactNode;
  if (me.verification === "verified") {
    body = <VerificationStatus state="verified" watching={false} />;
  } else if (!me.studentEmail) {
    const active = await activeStudentCode(me.id);
    body = active ? (
      <CodeStep
        steps={[]}
        email={active.email}
        devCode={peekDevCode(me.id)}
        resendIn={Math.max(0, CODE_RESEND_SECONDS - Math.floor((Date.now() - active.createdAt.getTime()) / 1000))}
      />
    ) : (
      <StudentEmailStep steps={[]} loginEmail={me.email} needsBirth={false} fromGoogle={false} />
    );
  } else if (record?.status === "pending" && record.idDocumentRef) {
    body = <VerificationStatus state="pending" watching={me.awaitingReview} />;
  } else {
    body = (
      <IdStep steps={[]} rejectedReason={record?.status === "rejected" ? (record.rejectedReason ?? "") : null} />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-text">
          <ShieldCheck className="size-5 text-brand-500" />
          {t("title")}
        </h1>
        <p className="measure text-sm text-text-muted">{t("subtitle")}</p>
      </header>

      <Card className="flex flex-col gap-1 border-brand-500/25 bg-brand-500/6 p-4">
        <p className="text-sm font-semibold text-text">{t("why")}</p>
        <p className="measure text-sm text-text-muted">{t("whyBody")}</p>
      </Card>

      <Card className="p-5 sm:p-7">{body}</Card>
    </div>
  );
}
