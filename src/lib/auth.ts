import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL ?? "").toLowerCase();

function effectiveRole(email: string, storedRole: Role): Role {
  return email.toLowerCase() === SUPER_ADMIN_EMAIL ? "SUPER_ADMIN" : storedRole;
}

// 400 days — the practical cap most browsers allow on a cookie's lifetime,
// used here as "effectively permanent". Only meaningfully matters for
// accounts Super Admin has marked stayLoggedIn (see User.stayLoggedIn):
// everyone else still gets kicked out by the 2-minute inactivity timer
// (InactivityLogout) long before this would ever come into play.
const SESSION_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

export const authOptions: AuthOptions = {
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const email = credentials.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: effectiveRole(user.email, user.role),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
};

export { SUPER_ADMIN_EMAIL, effectiveRole };
