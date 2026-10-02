import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authAdapter } from "@/lib/auth-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { RESET_INTENT_COOKIE, RESET_PASS_COOKIE, RESET_PASS_MINUTES, makeResetPass } from "@/lib/password-reset";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: string;
      onboarded: boolean;
    } & DefaultSession["user"];
  }
}

/**
 * Hyrja pranon email ose emër përdoruesi.
 *
 * Studenti e mban mend «petrit.cana» më lehtë se emailin e fakultetit, prandaj
 * fusha e parë pranon të dyja. Emri i përdoruesit krahasohet pa dallim shkronjash
 * të mëdha, sepse i njëjti emër nuk duhet të bëhet dy llogari.
 */
const credentialsSchema = z.object({
  email: z.string().trim().min(3),
  password: z.string().min(1),
});

const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
export const isGoogleEnabled = googleEnabled;

/** Hyrja me një klikim si llogari demo, e ndezur vetëm nga DEMO_MODE. */
export const isDemoMode = process.env.DEMO_MODE === "true";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: authAdapter,
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/hyr", newUser: "/regjistrohu", error: "/hyr" },
  trustHost: true,
  providers: [
    ...(googleEnabled
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            // Google e ka vërtetuar emailin, prandaj lidhet me llogarinë ekzistuese me të njëjtin email.
            allowDangerousEmailAccountLinking: true,
            // Zgjedhja e llogarisë del gjithmonë, që studenti të zgjedhë atë @student.uni-pr.edu.
            authorization: { params: { prompt: "select_account" } },
          }),
        ]
      : []),
    Credentials({
      id: "credentials",
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const identifier = parsed.data.email.toLowerCase().trim();
        const user = identifier.includes("@")
          ? await db.user.findUnique({ where: { email: identifier } })
          : await db.user.findFirst({ where: { username: identifier } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, image: user.avatar };
      },
    }),
    /**
     * Hyrje demo pa fjalëkalim. Ekziston vetëm kur DEMO_MODE është i ndezur, që
     * çdo gjendje e produktit të shihet pa krijuar llogari. Kurrë në prodhim.
     */
    ...(isDemoMode
      ? [
          Credentials({
            id: "demo",
            name: "demo",
            credentials: { userId: {} },
            async authorize(raw) {
              const userId = typeof raw?.userId === "string" ? raw.userId : null;
              if (!userId) return null;

              const user = await db.user.findFirst({
                where: { id: userId, demoLabel: { not: null } },
              });
              if (!user) return null;

              return { id: user.id, name: user.name, email: user.email, image: user.avatar };
            },
          }),
        ]
      : []),
  ],
  events: {
    /**
     * Pas Google-it në rrugën e password-it të harruar: leja e nënshkruar për
     * pikërisht këtë llogari, dhjetë minuta, dhe qëllimi fshihet.
     */
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.id) return;
      const jar = await cookies();
      if (!jar.get(RESET_INTENT_COOKIE)) return;
      jar.delete(RESET_INTENT_COOKIE);
      jar.set(RESET_PASS_COOKIE, makeResetPass(user.id), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: RESET_PASS_MINUTES * 60,
      });
    },
  },
  callbacks: {
    /** Me Google hyn vetëm kush e ka emailin të konfirmuar nga Google. */
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      if (profile?.email_verified !== true || typeof profile.email !== "string") return false;

      // «Ke harruar password-in?»: Google vetëm konfirmon një llogari që ekziston, nuk krijon të re.
      const jar = await cookies();
      if (jar.get(RESET_INTENT_COOKIE)) {
        const exists = await db.user.findUnique({ where: { email: profile.email.toLowerCase() }, select: { id: true } });
        if (!exists) {
          jar.delete(RESET_INTENT_COOKIE);
          return "/harrova-password?gabim=pa-llogari";
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user?.id) token.sub = user.id;
      if (!token.sub) return token;

      if (user || trigger === "update" || token.username === undefined) {
        const record = await db.user.findUnique({
          where: { id: token.sub },
          select: { username: true, role: true, onboardedAt: true, name: true, avatar: true },
        });
        if (record) {
          token.username = record.username;
          token.role = record.role;
          token.onboarded = Boolean(record.onboardedAt);
          token.name = record.name;
          token.picture = record.avatar;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.user.username = (token.username as string) ?? "";
      session.user.role = (token.role as string) ?? "student";
      session.user.onboarded = Boolean(token.onboarded);
      return session;
    },
  },
});
