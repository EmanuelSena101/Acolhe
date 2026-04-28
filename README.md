# Acolhe

SaaS B2G para prefeituras brasileiras gerenciarem o trabalho dos Agentes Comunitarios de Saude (ACS) da Atencao Primaria a Saude.

## Diferenciais

- Ferramenta moderna de campo para ACS (PWA mobile-first)
- Visibilidade em tempo real da cobertura territorial
- **Import e export compativeis com e-SUS APS PEC** — adocao sem abandonar o sistema oficial

## Stack

Next.js 14 (App Router) | TypeScript | tRPC v11 | Prisma 5 | PostgreSQL 16 + PostGIS 3.4 | NextAuth v5 | Tailwind CSS + shadcn/ui | MapLibre GL JS | BullMQ + Redis

## Setup Local

```bash
# 1. Subir banco e Redis
docker-compose up -d

# 2. Instalar dependencias
npm install

# 3. Rodar migrations
npm run db:migrate

# 4. Popular com dados de demo
npm run seed

# 5. Iniciar servidor de desenvolvimento
npm run dev
```

## Credenciais de Demo

| Papel                         | E-mail                    | Senha    |
| ----------------------------- | ------------------------- | -------- |
| SUPERADMIN                    | admin@saudeterritorio.dev | admin123 |
| COORD_MUNICIPAL (Campo Limpo) | coord.cl@demo             | demo123  |
| COORD_MUNICIPAL (Varzea)      | coord.vp@demo             | demo123  |
| GERENTE_UBS                   | gerente1.cl@demo          | demo123  |
| ACS                           | acs1.cl@demo              | demo123  |

## Comandos

| Comando              | Descricao                       |
| -------------------- | ------------------------------- |
| `npm run dev`        | Servidor de desenvolvimento     |
| `npm run build`      | Build de producao               |
| `npm run lint`       | ESLint                          |
| `npm run typecheck`  | Verificacao de tipos            |
| `npm run test`       | Testes unitarios (Vitest)       |
| `npm run test:e2e`   | Testes E2E (Playwright)         |
| `npm run db:migrate` | Rodar migrations Prisma         |
| `npm run seed`       | Popular banco com dados de demo |

## Deploy (Railway)

1. Criar projeto no [Railway](https://railway.app)
2. Adicionar serviço PostgreSQL + Redis
3. Configurar variaveis de ambiente (veja `.env.example`)
4. Conectar repositorio GitHub — Railway detecta o `railway.toml` automaticamente
5. Deploy roda: `prisma migrate deploy` + `node server.js`

Variáveis obrigatórias no Railway:

- `DATABASE_URL` (gerado pelo serviço PostgreSQL)
- `REDIS_URL` (gerado pelo serviço Redis)
- `NEXTAUTH_URL` (URL pública do deploy)
- `NEXTAUTH_SECRET` (gerar com `openssl rand -base64 32`)

## CI/CD

GitHub Actions roda em PRs e pushes para `main` e `init-branch`:

- Lint (ESLint)
- Typecheck (TypeScript)
- Unit Tests (Vitest) — 104+ testes
- Build (Next.js)

## Documentacao

- [Arquitetura](docs/ARCHITECTURE.md)
- [Formatos e-SUS APS](docs/ESUS_FORMATS.md)
- [Integracao gov.br](docs/GOVBR_AUTH.md)
- [Roteiro de Demo](docs/DEMO_SCRIPT.md)
- [TODO / Roadmap](docs/TODO.md)

## Licenca

Proprietario — Uso exclusivo.
