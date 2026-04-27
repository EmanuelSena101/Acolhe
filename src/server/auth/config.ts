import { type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/server/db";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      nome: string;
      papel: string;
      prefeituraId: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    nome: string;
    papel: string;
    prefeituraId: string | null;
  }
}

export const authConfig: NextAuthConfig = {
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.usuario.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.senhaHash || !user.ativo) return null;

        const isValid = await compare(credentials.password as string, user.senhaHash);
        if (!isValid) return null;

        await db.usuario.update({
          where: { id: user.id },
          data: { ultimoLogin: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          nome: user.nome,
          papel: user.papel,
          prefeituraId: user.prefeituraId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.papel = user.papel;
        token.prefeituraId = user.prefeituraId;
        token.nome = user.nome;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.papel = token.papel as string;
        session.user.prefeituraId = token.prefeituraId as string | null;
        session.user.nome = token.nome as string;
      }
      return session;
    },
  },
};
