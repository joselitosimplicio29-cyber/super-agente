import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/chat/:path*",
    "/dashboard/:path*",
    "/midia/:path*",
    "/clientes/:path*",
    "/agenda/:path*",
    "/financeiro/:path*",
    "/historico/:path*",
    "/kanban/:path*",
    "/notas/:path*",
    "/configuracoes/:path*",
    "/api/chat/:path*",
    "/api/memory/:path*",
    "/api/conversations/:path*",
  ],
};
