export type MailMessage = {
  to: string;
  subject: string;
  /** Teksti i thjeshtë. Gjithmonë i pranishëm: disa klientë nuk lexojnë HTML. */
  text: string;
  html?: string;
};

export type MailResult = { ok: true } | { ok: false; error: string };

export type MailProvider = {
  name: string;
  send: (message: MailMessage) => Promise<MailResult>;
};
