import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";

interface GovBRProfile {
  sub: string;
  email: string;
  name: string;
  email_verified: boolean;
  picture?: string;
}

interface GovBRProviderConfig extends OAuthUserConfig<GovBRProfile> {
  environment?: "staging" | "production";
}

const ENDPOINTS = {
  staging: {
    authorization: "https://sso.staging.acesso.gov.br/authorize",
    token: "https://sso.staging.acesso.gov.br/token",
    userinfo: "https://sso.staging.acesso.gov.br/userinfo",
  },
  production: {
    authorization: "https://sso.acesso.gov.br/authorize",
    token: "https://sso.acesso.gov.br/token",
    userinfo: "https://sso.acesso.gov.br/userinfo",
  },
} as const;

export function GovBRProvider(config: GovBRProviderConfig): OAuthConfig<GovBRProfile> {
  const env = config.environment ?? "staging";
  const endpoints = ENDPOINTS[env];

  return {
    id: "govbr",
    name: "gov.br",
    type: "oidc",
    issuer: env === "staging" ? "https://sso.staging.acesso.gov.br" : "https://sso.acesso.gov.br",
    authorization: {
      url: endpoints.authorization,
      params: {
        scope: "openid email profile govbr_confiabilidades",
        response_type: "code",
      },
    },
    token: endpoints.token,
    userinfo: endpoints.userinfo,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    checks: ["pkce", "state"],
    profile(profile) {
      return {
        id: profile.sub,
        email: profile.email,
        nome: profile.name,
        papel: "VISUALIZADOR" as const,
        prefeituraId: null,
      };
    },
  };
}
