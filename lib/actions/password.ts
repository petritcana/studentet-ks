"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { mailIsLive, sendMail } from "@/lib/email";
import { canContinue } from "@/lib/password-rules";
import { isRateLimited, rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";
import { SITE } from "@/lib/site";
import { fail, succeed, type ActionState } from "./types";

/**
 * Ndërrimi i password-it brenda platformës.
 *
 * Kërkon password-in e vjetër, që një telefon i harruar i hapur të mos mjaftojë
 * për ta marrë llogarinë. I riu ndjek të njëjtat rregulla si te regjistrimi
 * (`lib/password-rules.ts`) dhe nuk mund të jetë i njëjti. Pas ndryshimit, kur
 * emaili është i lidhur, studenti merr një njoftim: nëse s'e bëri ai, e di menjëherë.
 */
export async function changePassword(current: string, next: string, confirm: string): Promise<ActionState> {
  const me = await requireUser();
  // Numërohen vetëm provat me password të vjetër të gabuar: pesë në orë, pastaj pritet.
  const limitKey = `change:${me.id}`;
  if (isRateLimited("passwordReset", limitKey)) return fail("errors.rateLimited");

  const record = await db.user.findUnique({ where: { id: me.id }, select: { passwordHash: true, email: true, firstName: true, name: true } });
  if (!record?.passwordHash) return fail("password.errorNoPassword");

  if (!current || !(await bcrypt.compare(current, record.passwordHash))) {
    rateLimit("passwordReset", limitKey);
    return fail("password.errorCurrent");
  }
  if (!canContinue(next, confirm)) return fail("password.errorRules");
  if (await bcrypt.compare(next, record.passwordHash)) return fail("password.errorSame");

  await db.user.update({ where: { id: me.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });

  if (mailIsLive()) {
    const first = record.firstName ?? record.name.split(" ")[0];
    void sendMail({
      to: record.email,
      subject: `Password-i yt te ${SITE.name} u ndryshua`,
      text: [
        `Përshëndetje ${first},`,
        "",
        `Password-i i llogarisë sate te ${SITE.name} sapo u ndryshua.`,
        "Nëse e bëre ti, s'ke çfarë të bësh.",
        `Nëse jo, hape menjëherë «Ke harruar password-in?» te faqja e hyrjes, ose shkruaj te ${SITE.contactEmail}.`,
      ].join("\n"),
    }).catch(() => undefined);
  }

  return succeed("password.changed");
}
