import type { MailProvider } from "./types";

/**
 * Dërgimi me SMTP, p.sh. me një llogari Gmail.
 *
 * Zgjedhur sepse është rruga që ekziston tashmë për këdo: një adresë Gmail dhe
 * një «app password» e dyfishtë mjaftojnë, pa llogari te ndonjë shërbim i ri.
 * Gmail nuk e pranon fjalëkalimin e zakonshëm, prandaj te `MAIL_PASSWORD` shkon
 * fjalëkalimi i aplikacionit, i krijuar te llogaria Google.
 *
 * Nevojiten: `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM`.
 * Për Gmail: smtp.gmail.com, porta 465.
 */
export const smtpMailer: MailProvider = {
  name: "smtp",
  async send(message) {
    const host = process.env.MAIL_HOST;
    const user = process.env.MAIL_USER;
    const password = process.env.MAIL_PASSWORD;
    const from = process.env.MAIL_FROM ?? user;

    if (!host || !user || !password || !from) return { ok: false, error: "mail_not_configured" };

    try {
      // Ngarkimi bëhet këtu, që paketa të mos hyjë te pakoja e klientit.
      const { createTransport } = await import("nodemailer");
      const port = Number(process.env.MAIL_PORT ?? 465);

      const transport = createTransport({
        host,
        port,
        // 465 është TLS i drejtpërdrejtë; 587 nis i pakriptuar dhe ngrihet me STARTTLS.
        secure: port === 465,
        auth: { user, pass: password },
      });

      await transport.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
      });

      return { ok: true };
    } catch (error) {
      console.error("[email] smtp nuk u arrit:", error);
      return { ok: false, error: "mail_unreachable" };
    }
  },
};
