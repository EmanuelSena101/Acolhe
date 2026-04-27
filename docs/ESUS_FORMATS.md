# Formatos e-SUS APS — Contrato de Import/Export

> Este documento define o contrato exaustivo dos formatos aceitos pelo importador e gerados pelo exportador do SaudeTerritorio.
> Sera detalhado completamente no Bloco 10 da implementacao.

## Status: RASCUNHO

TODO: Detalhar esquemas CSV, XML, aliases, validacoes e exemplos inline.

## Tipos Suportados

- `ESUS_CSV_FICHA_A` — Cadastro Domiciliar
- `ESUS_CSV_FICHA_B` — Cadastro Individual
- `ESUS_CSV_VISITA` — Ficha de Visita Domiciliar
- `ESUS_XML` — Pacote XML do e-SUS APS
- `ESUS_ZIP` — ZIP contendo qualquer combinacao dos acima

## Encodings Aceitos

- UTF-8 (com ou sem BOM)
- Latin-1 (ISO 8859-1)
- Windows-1252

## Separadores CSV

- `;` (padrao e-SUS)
- `,` (alternativo)
- Auto-detectado por amostragem das primeiras 5 linhas

## Formatos de Data

- DD/MM/YYYY
- YYYY-MM-DD
- ISO 8601
