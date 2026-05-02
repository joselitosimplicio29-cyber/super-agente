import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Dev Login",
      credentials: {},
      async authorize() {
        return {
          id: "dev-user",
          name: "Dev User",
          email: "dev@local.com",
        };
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || "dev-secret",
  session: {
    strategy: "jwt",
  },
});

export { handler as GET, handler as POST };