# TODO — Itens Fora do Escopo do MVP

Issues e melhorias documentadas para versoes futuras.

## Funcionalidades

- [ ] Sync offline no PWA (atualmente apenas manifest + SW basico)
- [ ] Notificacoes push para ACS (visitas do dia, lembretes)
- [ ] Cadastro de novo domicilio pelo ACS diretamente no app
- [ ] Filtros avancados na exportacao (por periodo, equipe, microarea)
- [ ] Dashboard com graficos de tendencia temporal (chart.js / recharts)
- [ ] Relatorio de produtividade por ACS em PDF individual

## Integracao

- [ ] `external-dependency`: Integracao real com gov.br em producao (requer credenciais de homologacao)
- [ ] `external-dependency`: Consumo da API IBGE Malhas para contornos de municipio
- [ ] Webhook para notificar sistemas externos apos importacao
- [ ] API publica REST para integracao com secretarias estaduais

## Infraestrutura

- [ ] Cache de geocoding com Redis (Nominatim rate limiting)
- [ ] CDN para tiles do mapa (reduzir carga no OSM)
- [ ] Monitoramento com Sentry (DSN configuravel via env)
- [ ] Backup automatico do banco (pg_dump schedule)
- [ ] Rate limiting no upload endpoint

## Seguranca

- [ ] CPF hasheado com bcrypt (atualmente nao armazenado)
- [ ] CSRF tokens no formulario de login
- [ ] Content Security Policy headers
- [ ] Rotacao automatica de NEXTAUTH_SECRET

## Testes

- [ ] E2E round-trip completo (export → import → diff zero)
- [ ] Testes de carga com k6 (importacao de 10k registros)
- [ ] Testes de acessibilidade (axe-core)
- [ ] Cobertura de testes unitarios nos routers tRPC
