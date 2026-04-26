import { withAuth } from "next-auth/middleware";

// Esto protege toda la aplicación. Si no tienes sesión activa, te envía a /login
export default withAuth({
  pages: {
    signIn: "/login",
  },
});

// Le decimos qué rutas exactas queremos proteger
export const config = {
  matcher: ["/", "/api/clases/:path*", "/api/laboratorios/:path*"],
};