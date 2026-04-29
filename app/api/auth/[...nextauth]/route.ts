import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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
        
        const { data: user, error } = await supabase
          .from('User')
          .select('*')
          .eq('email', credentials.email)
          .single();

        // CAMBIO AQUÍ: Cambiamos 'user.passwordHash' por 'user.password'
        if (error || !user || !user.password) return null;

        // CAMBIO AQUÍ: Comparamos contra la columna 'password'
        const passwordsMatch = await bcrypt.compare(credentials.password, user.password);
        
        if (!passwordsMatch) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role } as any;
      }
    })
  ],
  pages: { signIn: '/login' },
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
  secret: process.env.NEXTAUTH_SECRET || "SAIL_SUPER_SECRETO_2026",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };