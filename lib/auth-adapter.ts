import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import { db } from "@/lib/db";
import { looksLikeStudentId } from "@/lib/identity";
import { createWithUniqueUsername } from "@/lib/queries/username";
import { isInstitutionalEmail } from "@/lib/types";
import { linkStudentEmail, studentEmailTaken } from "@/lib/registration";
import { usernameBase } from "@/lib/username";

/*
  Përdoruesi i ri nga Google krijohet këtu, jo nga adapteri i gatshëm.

  Adapteri i Prisma-s shkruan fushën `image`, që te ne nuk ekziston (fotoja rri
  te `avatar` dhe ngarkohet në onboarding), dhe nuk shkruan `username`, që është
  i detyrueshëm. Pa këtë, hyrja e parë me Google dështonte në krijim.

  Google e ka provuar vetë emailin (`email_verified`, kontrolluar te `signIn`),
  prandaj `emailVerified` shënohet menjëherë. Shenja e verifikimit jepet vetëm
  për domenet institucionale, si te regjistrimi me email.
*/
const baseAdapter = PrismaAdapter(db);

function googleUsernameBase(name: string, email: string) {
  // Emri i përdoruesit del nga emri i vërtetë: `pc12345@student...` nuk i thotë asgjë askujt.
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return usernameBase(parts[0], parts.slice(1).join(" "));
  if (looksLikeStudentId(email)) return usernameBase(parts[0] ?? "student", "");
  return usernameBase(parts[0] ?? "student", "", email);
}

export const authAdapter: Adapter = {
  ...baseAdapter,
  async createUser(data: AdapterUser) {
    const email = data.email.toLowerCase().trim();
    const name = (data.name ?? "").trim() || email.split("@")[0];
    const parts = name.split(/\s+/).filter(Boolean);
    const institutional = isInstitutionalEmail(email);
    const now = new Date();

    const user = await createWithUniqueUsername(googleUsernameBase(name, email), (username) =>
      db.user.create({
        data: {
          email,
          name,
          username,
          firstName: parts[0] ?? null,
          lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
          emailVerified: data.emailVerified ?? now,
          // Shenja nuk jepet nga domeni: vjen kur admini miraton ID-në. Deri
          // atëherë llogaria e re vetëm shikon, njësoj si regjistrimi me email.
          isVerified: false,
          verification: "unverified",
          awaitingReview: true,
          termsAcceptedAt: now,
        },
        select: { id: true, email: true, name: true, emailVerified: true },
      }),
    );

    // Google e ka provuar adresën: kur ajo është studentore, nuk kërkohet kod.
    if (institutional && !(await studentEmailTaken(email, user.id))) await linkStudentEmail(user.id, email, now);

    return { id: user.id, email: user.email, name: user.name, emailVerified: user.emailVerified, image: null };
  },
};
