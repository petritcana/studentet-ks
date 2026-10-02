import "server-only";

import { consoleMailer } from "./console";
import { resendMailer } from "./resend";
import { smtpMailer } from "./smtp";
import type { MailMessage, MailProvider, MailResult } from "./types";

export type { MailMessage, MailProvider, MailResult } from "./types";

/**
 * Dërgimi i emailit.
 *
 * Një ndërfaqe, disa ofrues, ashtu si te `lib/billing`. Pa çelës, punon ofruesi
 * i konsolës: emaili shkruhet te regjistri i serverit dhe rrjedha provohet e
 * tëra pa llogari të jashtme. Me `RESEND_API_KEY`, i njëjti kod dërgon email të
 * vërtetë, pa e prekur asnjë thirrje.
 *
 * Kalimi te një ofrues tjetër është një skedar i ri këtu, asgjë tjetër.
 */
function provider(): MailProvider {
  const chosen = (process.env.MAIL_PROVIDER ?? "").toLowerCase();

  if (chosen === "console") return consoleMailer;
  if (chosen === "smtp") return smtpMailer;
  if (chosen === "resend") return resendMailer;

  // Pa zgjedhje të shprehur, vendos ajo që është e konfiguruar vërtet.
  if (process.env.RESEND_API_KEY) return resendMailer;
  if (process.env.MAIL_HOST && process.env.MAIL_USER) return smtpMailer;
  return consoleMailer;
}

export function mailProviderName(): string {
  return provider().name;
}

/** A dërgohen vërtet email-e, apo vetëm shkruhen te regjistri. */
export function mailIsLive(): boolean {
  return provider().name !== "console";
}

/**
 * Lokalisht, emaili i vërtetë shkon vetëm te adresat e lejuara (`MAIL_ALLOW_ONLY`,
 * adresa të plota ose `@domen`, të ndara me presje). Llogaritë e seed-it kanë
 * domene të vërteta (Gmail, UP, UBT) dhe emra që mund t'i përkasin dikujt: një
 * provë nuk duhet t'i shkruajë kurrë një personi të vërtetë. Pa këtë rresht
 * (në host), emaili shkon te kushdo.
 */
function allowed(to: string) {
  const list = process.env.MAIL_ALLOW_ONLY?.trim();
  if (!list) return true;
  const address = to.trim().toLowerCase();
  return list
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .some((item) => (item.startsWith("@") ? address.endsWith(item) : address === item));
}

/** A arrin vërtet një email te kjo adresë, apo shkruhet vetëm te regjistri. */
export function mailReaches(to: string): boolean {
  return mailIsLive() && allowed(to);
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  if (!allowed(message.to)) return consoleMailer.send(message);
  return provider().send(message);
}
