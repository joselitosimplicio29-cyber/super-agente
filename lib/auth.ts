import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const allowed = process.env.ALLOWED_EMAILS?.split(",") || [];
      if (!allowed.includes(user.email!)) return false;

      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("email", user.email)
        .single();

      if (!data) {
        const isAdmin = process.env.ADMIN_EMAILS?.split(",").includes(user.email!);
        await supabase.from("users").insert({
          email: user.email,
          name: user.name,
          avatar_url: user.image,
          role: isAdmin ? "admin" : "member",
        });
      } else {
        await supabase
          .from("users")
          .update({ last_login_at: new Date().toISOString() })
          .eq("email", user.email);
      }

      return true;
    },
    async session({ session }) {
      const { data: dbUser } = await supabase
        .from("users")
        .select("*")
        .eq("email", session.user!.email)
        .single();

      if (dbUser) {
        (session.user as any).id = dbUser.id;
        (session.user as any).role = dbUser.role;
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
};
