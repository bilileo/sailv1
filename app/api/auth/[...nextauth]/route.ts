import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import sql from 'mssql';
import bcrypt from 'bcryptjs';

const dbConfig = {
  user: 'sa', 
  password: 'admin123', // <-- Tu contraseña de SQL
  server: 'localhost',
  database: 'SAIL_DB',
  options: { encrypt: false, trustServerCertificate: true }
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" }
      },
        async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;
                
                const pool = await sql.connect(dbConfig);
                const result = await pool.request()
                .input('email', sql.NVarChar(255), credentials.email)
                .query('SELECT * FROM [User] WHERE email = @email');

                const user = result.recordset[0];
                
                // Usamos user.passwordHash según tu base de datos
                if (!user || !user.passwordHash) return null;

                // Comparamos contra user.passwordHash
                const passwordsMatch = await bcrypt.compare(credentials.password, user.passwordHash);
                if (!passwordsMatch) return null;

                return { id: user.id, name: user.name, email: user.email, role: user.role } as any;
            }
    })
  ],
  pages: { signIn: '/login' }, // Le decimos a dónde mandar si no hay sesión
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.role = (user as any).role; token.id = user.id; }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) { (session.user as any).role = token.role; (session.user as any).id = token.id; }
      return session;
    }
  },
  secret: "SAIL_SUPER_SECRETO_2026", // Llave para encriptar las cookies
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };