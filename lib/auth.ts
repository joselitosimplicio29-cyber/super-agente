import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async signIn() {
      // TEMPORÁRIO: libera qualquer conta Google para testar o chat
      return true;
    },

    async session({ session }) {
      // TEMPORÁRIO: cria um ID fixo para testes
      if (session.user) {
        (session.user as any).id = "test-user";
        (session.user as any).role = "admin";
      }

      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/auth/error",
  },

  secret: process.env.NEXTAUTH_SECRET,
};