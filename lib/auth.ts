import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { isInstitutionalEmail } from "@/lib/constants";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: string;
      isVerified: boolean;
      onboarded: boolean;
    } & DefaultSession["user"];
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

/** UI-ja e fsheh butonin e Google-it nëse çelësat mungojnë, në vend ta shfaqë të vdekur. */
export const isGoogleEnabled = googleEnabled;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/hyr", newUser: "/regjistrohu", error: "/hyr" },
  trustHost: true,
  providers: [
    ...(googleEnabled
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Fjalëkalimi", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email.toLowerCase().trim() },
        });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatar,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user?.id) token.sub = user.id;
      if (!token.sub) return token;

      // Rifreskohet në hyrje dhe sa herë sesioni përditësohet nga onboarding-u.
      if (user || trigger === "update" || token.username === undefined) {
        const record = await db.user.findUnique({
          where: { id: token.sub },
          select: {
            username: true,
            role: true,
            isVerified: true,
            onboardedAt: true,
            name: true,
            avatar: true,
          },
        });
        if (record) {
          token.username = record.username;
          token.role = record.role;
          token.isVerified = record.isVerified;
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
      session.user.isVerified = Boolean(token.isVerified);
      session.user.onboarded = Boolean(token.onboarded);
      return session;
    },
  },
  events: {
    /**
     * Hyrja me Google nuk kalon nëpër formën tonë, prandaj emri i përdoruesit
     * dhe verifikimi institucional plotësohen këtu.
     */
    async createUser({ user }) {
      if (!user.id || !user.email) return;
      const base = user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9.]/g, "");
      let username = base || `student${Date.now()}`;
      let attempt = 1;
      while (await db.user.findUnique({ where: { username } })) {
        attempt += 1;
        username = `${base}${attempt}`;
      }
      await db.user.update({
        where: { id: user.id },
        data: {
          username,
          isVerified: isInstitutionalEmail(user.email),
          emailVerified: isInstitutionalEmail(user.email) ? new Date() : null,
        },
      });
    },
  },
});

/** Sesioni i kërkuar. Përdoret në faqet që s'ekzistojnë pa përdorues. */
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session;
}
