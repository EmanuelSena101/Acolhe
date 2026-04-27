# Integracao gov.br — Guia de Configuracao

## Visao Geral

O SaudeTerritorio suporta login institucional via **gov.br** (OAuth 2.0 / OIDC).
Servidores publicos podem acessar o sistema usando suas credenciais gov.br.

## Ambientes

| Ambiente    | Authorization Endpoint                        |
| ----------- | --------------------------------------------- |
| Homologacao | `https://sso.staging.acesso.gov.br/authorize` |
| Producao    | `https://sso.acesso.gov.br/authorize`         |

## Configuracao

### 1. Obter Credenciais

Solicite acesso ao ambiente de homologacao do gov.br em:
https://manual-roteiro-integracao-login-unico.servicos.gov.br/

### 2. Variaveis de Ambiente

```env
GOVBR_CLIENT_ID=seu_client_id
GOVBR_CLIENT_SECRET=seu_client_secret
GOVBR_ENV=staging
GOVBR_REDIRECT_URI=http://localhost:3000/api/auth/callback/govbr
```

### 3. Scopes

- `openid` — obrigatorio
- `email` — e-mail do usuario
- `profile` — nome completo
- `govbr_confiabilidades` — nivel de confiabilidade

### 4. Fluxo

1. Usuario clica "Entrar com gov.br"
2. Redirect para `/authorize` do gov.br com PKCE
3. gov.br retorna `code`
4. Backend troca `code` por `access_token` + `id_token`
5. Backend chama `/userinfo`, extrai `sub` (CPF)
6. Busca/cria `Usuario` com `govbrSub`
7. Se primeiro login: redirect para "Aguardando aprovacao"
8. SUPERADMIN aprova e atribui prefeitura + papel
9. Sessao NextAuth criada normalmente

### 5. Comportamento sem Credenciais

Se `GOVBR_CLIENT_ID` nao estiver configurado no `.env`, o botao "Entrar com gov.br"
aparece desabilitado com tooltip "Configurar credenciais gov.br no .env".
