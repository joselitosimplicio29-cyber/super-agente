import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getEmails(envValue?: string) {
  return (envValue || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();

      if (!email) {
        return false;
      }

      const allowedEmails = getEmails(process.env.ALLOWED_EMAILS);
      const adminEmails = getEmails(process.env.ADMIN_EMAILS);

      // Se ALLOWED_EMAILS estiver vazio, libera qualquer Google.
      // Se quiser bloquear, coloque os emails no Vercel.
      if (allowedEmails.length > 0 && !allowedEmails.includes(email)) {
        return false;
      }

      const { data: existingUser } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      const isAdmin = adminEmails.includes(email);

      if (!existingUser) {
        const { error } = await supabase.from("users").insert({
          email,
          name: user.name,
          avatar_url: user.image,
          role: isAdmin ? "admin" : "member",
          last_login_at: new Date().toISOString(),
        });

        if (error) {
          console.error("Erro ao criar usuário:", error);
          return false;
        }
      } else {
        const { error } = await supabase
          .from("users")
          .update({
            name: user.name,
            avatar_url: user.image,
            role: existingUser.role || (isAdmin ? "admin" : "member"),
            last_login_at: new Date().toISOString(),
          })
          .eq("email", email);

        if (error) {
          console.error("Erro ao atualizar usuário:", error);
          return false;
        }
      }

      return true;
    },

    async session({ session }) {
      const email = session.user?.email?.toLowerCase();

      if (!email) {
        return session;
      }

      const { data: dbUser } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (dbUser && session.user) {
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

  secret: process.env.NEXTAUTH_SECRET,
};