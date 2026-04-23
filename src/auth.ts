import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD_HASH_B64 = process.env.ADMIN_PASSWORD_HASH_B64 ?? "";
const ADMIN_PASSWORD_HASH = ADMIN_PASSWORD_HASH_B64
  ? Buffer.from(ADMIN_PASSWORD_HASH_B64, "base64").toString("utf8")
  : "";
const ADMIN_PASSWORD_PLAIN = process.env.ADMIN_PASSWORD ?? "";

async function verifyPassword(input: string): Promise<boolean> {
  if (ADMIN_PASSWORD_HASH) {
    return bcrypt.compare(input, ADMIN_PASSWORD_HASH);
  }
  if (ADMIN_PASSWORD_PLAIN) {
    return input === ADMIN_PASSWORD_PLAIN;
  }
  return false;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = String(credentials?.username ?? "").trim();
        const password = String(credentials?.password ?? "");
        if (!username || !password) return null;
        if (username !== ADMIN_USERNAME) return null;
        const ok = await verifyPassword(password);
        if (!ok) return null;
        return { id: username, name: username };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.name = user.name;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.name) session.user.name = token.name;
      return session;
    },
  },
});
