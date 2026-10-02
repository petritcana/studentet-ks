import type { MailProvider } from "./types";

/**
 * Resend, përmes HTTP-së.
 *
 * Zgjedhur sepse punon te funksionet pa server, ku një lidhje SMTP e gjatë nuk
 * ka ku të jetojë, dhe sepse nuk kërkon asnjë varësi të re: vetëm `fetch`.
 * Nevojiten `RESEND_API_KEY` dhe `MAIL_FROM`.
 */
export const resendMailer: MailProvider = {
  name: "resend",
  async send(message) {
    const key = process.env.RESEND_API_KEY;
    const from = process.env.MAIL_FROM;

    if (!key || !from) return { ok: false, error: "mail_not_configured" };

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          ...(message.html ? { html: message.html } : {}),
        }),
      });

      if (!response.ok) {
        const detail = await response.text();
        console.error(`[email] resend ${response.status}: ${detail.slice(0, 200)}`);
        return { ok: false, error: "mail_rejected" };
      }

      return { ok: true };
    } catch (error) {
      console.error("[email] resend nuk u arrit:", error);
      return { ok: false, error: "mail_unreachable" };
    }
  },
};
