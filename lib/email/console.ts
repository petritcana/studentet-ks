import type { MailProvider } from "./types";

/**
 * Ofruesi i zhvillimit.
 *
 * Nuk dërgon asgjë: e shkruan emailin te regjistri i serverit, që rrjedha e
 * konfirmimit të provohet nga fillimi në fund pa çelës dhe pa llogari të jashtme.
 * Kurrë nuk duhet të jetë ofruesi i prodhimit, prandaj `mailIsLive()` e thotë
 * hapur se emaili nuk po niset.
 */
export const consoleMailer: MailProvider = {
  name: "console",
  async send(message) {
    console.log(
      [
        "",
        "[email] nuk u dërgua, sepse nuk ka ofrues të vërtetë.",
        `[email] te:      ${message.to}`,
        `[email] subjekt: ${message.subject}`,
        `[email] teksti:  ${message.text.replace(/\n/g, " ")}`,
        "",
      ].join("\n"),
    );
    return { ok: true };
  },
};
