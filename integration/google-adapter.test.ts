import { afterAll, describe, expect, it } from "vitest";
import { authAdapter } from "@/lib/auth-adapter";
import { db } from "@/lib/db";

/**
 * Hyrja e parë me Google krijon llogarinë këtu.
 *
 * Adapteri i gatshëm i Prisma-s dështonte: shkruante `image`, që nuk ekziston,
 * dhe nuk shkruante `username`, që është i detyrueshëm. Kjo provë e krijon
 * përdoruesin si Google dhe e lidh llogarinë e Google-it me të.
 */
const stamp = Date.now().toString(36);
const studentEmail = `Provë.Google.${stamp}@Student.Uni-Pr.edu`;
const gmail = `prove.google.${stamp}@gmail.com`;

afterAll(async () => {
  await db.user.deleteMany({ where: { email: { in: [studentEmail.toLowerCase(), gmail] } } });
});

describe("krijimi i llogarisë nga Google", () => {
  it("studenti institucional merr username nga emri, emailin studentor të lidhur dhe pret ID-në", async () => {
    const user = await authAdapter.createUser!({
      id: "",
      email: studentEmail,
      name: "Provë Google",
      emailVerified: new Date(),
      image: "https://lh3.googleusercontent.com/a/foto",
    });

    const record = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(record.email).toBe(studentEmail.toLowerCase());
    expect(record.username).toMatch(/^prove\.google\d*$/);
    // Shenja vjen vetëm pasi admini miraton ID-në; deri atëherë llogaria vetëm shikon.
    expect(record.isVerified).toBe(false);
    expect(record.awaitingReview).toBe(true);
    expect(record.studentEmail).toBe(studentEmail.toLowerCase());
    expect(record.emailVerified).not.toBeNull();
    expect(record.passwordHash).toBeNull();
    expect(record.firstName).toBe("Provë");
    expect(record.lastName).toBe("Google");

    await authAdapter.linkAccount!({
      userId: user.id,
      type: "oidc",
      provider: "google",
      providerAccountId: `google-${stamp}`,
    });
    const linked = await authAdapter.getUserByAccount!({ provider: "google", providerAccountId: `google-${stamp}` });
    expect(linked?.id).toBe(user.id);
  });

  it("një Gmail i zakonshëm hyn, por i duhet ende emaili studentor", async () => {
    const user = await authAdapter.createUser!({ id: "", email: gmail, name: "Provë Google", emailVerified: new Date() });
    const record = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(record.isVerified).toBe(false);
    expect(record.verification).toBe("unverified");
    expect(record.studentEmail).toBeNull();
    expect(record.awaitingReview).toBe(true);
    // I njëjti emër nuk bëhet dy llogari: username-i i dytë merr prapashtesë.
    const first = await db.user.findFirstOrThrow({ where: { email: studentEmail.toLowerCase() } });
    expect(record.username).not.toBe(first.username);
  });
});
