import { type NextAuthConfig } from "next-auth";
import type { Provider } from "next-auth/providers";
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

function buildProviders(): Provider[] {
  const providers: Provider[] = [
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
  ];

  const govbrId = process.env.GOVBR_CLIENT_ID;
  const govbrSecret = process.env.GOVBR_CLIENT_SECRET;

  if (govbrId && govbrSecret) {
    providers.push({
      id: "govbr",
      name: "gov.br",
      type: "oidc",
      issuer: "https://sso.acesso.gov.br",
      clientId: govbrId,
      clientSecret: govbrSecret,
      authorization: {
        params: {
          scope: "openid email profile govbr_empresa",
          response_type: "code",
        },
      },
      profile(profile: Record<string, unknown>) {
        return {
          id: profile.sub as string,
          email: (profile.email ?? "") as string,
          nome: (profile.name ?? profile.preferred_username ?? "") as string,
          papel: "VISUALIZADOR",
          prefeituraId: null,
        };
      },
    });
  }

  return providers;
}

export const authConfig: NextAuthConfig = {
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: buildProviders(),
  callbacks: {
    authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = !!session?.user;
      const isAuthPage = nextUrl.pathname.startsWith("/login");
      const isApiRoute = nextUrl.pathname.startsWith("/api");

      if (isApiRoute) return true;

      if (isAuthPage) {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }

      return isLoggedIn;
    },
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

export const govbrEnabled = !!(process.env.GOVBR_CLIENT_ID && process.env.GOVBR_CLIENT_SECRET);
