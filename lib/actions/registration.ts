"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { checkBirthDate } from "@/lib/age";
import { activeStudentCode, confirmStudentCode, issueStudentCode, type IssueResult } from "@/lib/registration";
import { rateLimit } from "@/lib/rate-limit";
import { requireAccount } from "@/lib/session";
import { upcomingInstitutionFor } from "@/lib/student-domains";
import { fail, succeed, type ActionState } from "./types";

/**
 * Hapat e regjistrimit pas krijimit të llogarisë: kodi i emailit studentor dhe
 * fotoja e ID-së. Të gjithë punojnë mbi llogarinë e sesionit, kurrë mbi një id
 * që e dërgon klienti.
 */

type CodeState = ActionState & { devCode?: string };

function issueFailure(result: Extract<IssueResult, { ok: false }>, email: string): CodeState {
  if (result.reason === "notStudent") {
    const upcoming = upcomingInstitutionFor(email);
    return upcoming
      ? fail("auth.errorEmailUpcoming", undefined, { institution: upcoming.name })
      : fail("auth.errorEmailNotStudent");
  }
  if (result.reason === "taken") return fail("auth.errorEmailTakenHint");
  if (result.reason === "wait") return fail("signup.codeWait");
  return fail("signup.codeMailFailed");
}

/**
 * Emaili studentor i ri: për hyrjen me Google me adresë jo studentore, ose kur
 * studenti e ndërron adresën e shkruar gabim. Te Google kërkohet edhe data e
 * lindjes, nëse ende mungon.
 */
export async function sendStudentCode(email: string, birthDate?: string): Promise<CodeState> {
  const me = await requireAccount();
  if (me.studentEmail) return fail("signup.alreadyConfirmed");
  if (!rateLimit("emailCode", me.id).ok) return fail("errors.rateLimited");

  // Data e lindjes kërkohet te hyrja; kush e ka mbyllur atë më parë nuk e jep këtu.
  if (!me.birthDate && !me.onboardedAt) {
    const birth = checkBirthDate(birthDate ?? "");
    if (!birth.ok) return fail(`auth.${birth.reason}`);
    await db.user.update({ where: { id: me.id }, data: { birthDate: birth.date, ageConfirmedAt: new Date() } });
  }

  const clean = email.trim().toLowerCase();
  const result = await issueStudentCode(me, clean);
  if (!result.ok) return issueFailure(result, clean);

  // Llogaria e regjistruar me email e ndërron edhe adresën e hyrjes: e vjetra
  // ishte e shkruar gabim dhe nuk u provua kurrë.
  if (!me.emailVerified && me.email !== clean) {
    await db.user.update({ where: { id: me.id }, data: { email: clean } });
  }

  revalidatePath("/regjistrohu");
  return { ...succeed("signup.codeSent"), devCode: result.devCode };
}

/** «Dërgoje prapë»: i njëjti email, kod i ri. */
export async function resendStudentCode(): Promise<CodeState> {
  const me = await requireAccount();
  if (me.studentEmail) return fail("signup.alreadyConfirmed");
  if (!rateLimit("emailCode", me.id).ok) return fail("errors.rateLimited");

  const active = await activeStudentCode(me.id);
  const email = active?.email ?? (me.emailVerified ? null : me.email);
  if (!email) return fail("signup.codeExpired");

  const result = await issueStudentCode(me, email);
  if (!result.ok) return issueFailure(result, email);
  return { ...succeed("signup.codeSent"), devCode: result.devCode };
}

export async function confirmStudentEmail(code: string): Promise<ActionState> {
  const me = await requireAccount();
  if (me.studentEmail) return succeed();
  if (!/^\d{6}$/.test(code.trim())) return fail("signup.codeWrong");

  const result = await confirmStudentCode(me.id, code);
  if (!result.ok) {
    if (result.reason === "taken") return fail("auth.errorEmailTakenHint");
    return fail(
      result.reason === "wrong" ? "signup.codeWrong" : result.reason === "tooMany" ? "signup.codeTooMany" : "signup.codeExpired",
    );
  }

  revalidatePath("/regjistrohu");
  return succeed("signup.emailConfirmed");
}

/**
 * Fotoja e ID-së studentore.
 *
 * Bajtat ngarkohen te `/api/ngarko` (sipërfaqja `id`); këtu ruhet vetëm
 * referenca, dhe vetëm për një skedar që e ngarkoi vetë studenti. Kërkesa hyn
 * në radhën e moderimit; fotoja fshihet sapo merret vendimi.
 */
export async function submitIdDocument(mediaId: string): Promise<ActionState> {
  const me = await requireAccount();
  if (!me.studentEmail) return fail("verify.errorEmailFirst");
  if (me.verification === "verified") return succeed();

  const upload = await db.mediaUpload.findUnique({
    where: { assetId_userId: { assetId: mediaId, userId: me.id } },
    select: { asset: { select: { kind: true } } },
  });
  if (!upload || upload.asset.kind !== "image") return fail("signup.idMissing");

  const reference = `/api/media/${mediaId}`;
  const open = await db.verification.findFirst({
    where: { userId: me.id, kind: "student", status: { in: ["pending", "rejected"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true },
  });

  const data = {
    status: "pending",
    idDocumentRef: reference,
    rejectedReason: null,
    reviewerId: null,
    reviewedAt: null,
    submittedAt: new Date(),
    // Fotoja nuk mbahet përgjithmonë, edhe nëse askush nuk e shqyrton.
    purgeAfter: new Date(Date.now() + 30 * 86_400_000),
  };

  if (open) {
    await db.verification.update({ where: { id: open.id }, data });
  } else {
    await db.verification.create({ data: { ...data, userId: me.id, kind: "student", emailVerifiedAt: new Date() } });
  }
  await db.user.update({ where: { id: me.id }, data: { verification: "pending" } });

  revalidatePath("/regjistrohu");
  revalidatePath("/verifikimi");
  revalidatePath("/moderimi");
  return succeed("signup.idSent");
}
