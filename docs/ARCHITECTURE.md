# Arquitetura — SaudeTerritorio

## Visao Geral

```mermaid
graph TB
    subgraph Client
        Browser[Browser/PWA]
    end

    subgraph "Next.js App"
        AppRouter[App Router - Pages]
        TRPC[tRPC API]
        Auth[NextAuth v5]
        Upload[Upload API]
    end

    subgraph Services
        Geocoding[Geocoding Service]
        Routing[Routing Service]
        AgendaGen[Agenda Generator]
        ESUSImporter[e-SUS Importer]
        ESUSExporter[e-SUS Exporter]
    end

    subgraph Workers
        ImportWorker[Import Worker]
        ExportWorker[Export Worker]
        AgendaWorker[Agenda Worker]
    end

    subgraph Data
        Postgres[(PostgreSQL + PostGIS)]
        Redis[(Redis)]
    end

    subgraph External
        OSM[OpenStreetMap Tiles]
        Nominatim[Nominatim Geocoding]
        OSRM[OSRM Routing]
        GovBR[gov.br OAuth]
        IBGE[IBGE Malhas API]
    end

    Browser --> AppRouter
    Browser --> OSM
    AppRouter --> TRPC
    AppRouter --> Auth
    AppRouter --> Upload
    TRPC --> Services
    Services --> Postgres
    Workers --> Postgres
    Workers --> Redis
    TRPC --> Redis
    Geocoding --> Nominatim
    Routing --> OSRM
    Auth --> GovBR
```

## Decisoes Tecnicas

- **Next.js 14 App Router**: SSR + RSC para SEO e performance
- **tRPC v11**: Type-safety end-to-end entre client e server
- **Prisma + PostGIS**: ORM com suporte a geometrias via raw queries
- **BullMQ + Redis**: Filas para processamento assincrono de imports/exports
- **MapLibre GL JS**: Mapa open-source sem custos de licenca
- **Multi-tenant logico**: Campo `prefeituraId` em todas as entidades

## Modulos

| Modulo     | Responsabilidade                            |
| ---------- | ------------------------------------------- |
| Auth       | Login credentials + gov.br OAuth + RBAC     |
| Territorio | Gestao de microareas com validacao PNAB     |
| Domicilios | CRUD de domicilios e moradores              |
| Visitas    | Registro de visitas com check-in GPS        |
| Agenda     | Geracao automatica de roteiros diarios      |
| Importacao | Import e-SUS APS (CSV, XML, ZIP)            |
| Exportacao | Export e-SUS APS (CSV, XML, ZIP)            |
| Dashboard  | Painel de gestao com mapa e KPIs            |
| Relatorios | Cobertura, produtividade, visitas atrasadas |
