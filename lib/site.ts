/**
 * Të dhënat e platformës që shfaqen te studenti.
 *
 * Emaili rri këtu, në një vend të vetëm: kur të merret një domen i vërtetë,
 * ndryshon vetëm ky rresht, jo dhjetë faqe dhe dy katalogë.
 */
export const SITE = {
  /** Emri i platformës, ashtu si e lexon studenti te emailet dhe te faqja. */
  name: "Studentët.KS",
  /** Emaili zyrtar i kontaktit. Ndryshohet me `NEXT_PUBLIC_CONTACT_EMAIL`. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "studentet21@gmail.com",
} as const;
