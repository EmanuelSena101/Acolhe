# Roteiro de Demonstracao — SaudeTerritorio (15 min)

## Pre-requisitos

- Sistema rodando com seed pre-carregado
- Arquivo de demonstracao e-SUS fornecido pelo time comercial

## Roteiro

### 1. Login como Coordenador Municipal (1 min)

- Acesse o sistema
- Login como coordenador de Campo Limpo Paulista
- Credenciais: `coord.cl@demo` / `demo123`

### 2. Dashboard — Visao Geral (3 min)

- Mostre o mapa com as 8 microareas coloridas por equipe
- Hover nas microareas para ver detalhes
- Explique as cores das equipes e dos pontos de domicilio
- Verde = visita em dia, Amarelo = proximo do prazo, Vermelho = atrasado

### 3. Drill-down em Equipe (2 min)

- Clique em uma microarea
- Mostre detalhes da equipe e ACS responsavel
- Navegue para a lista de domicilios

### 4. Visao do ACS — Mobile (2 min)

- Troque para perfil ACS (emular celular no Chrome DevTools)
- Credenciais: `acs1.cl@demo` / `demo123`
- Mostre a agenda do dia com visitas ordenadas

### 5. Registrar Visita (2 min)

- Tap em um domicilio da agenda
- Clique "Cheguei" para capturar GPS
- Preencha formulario rapido
- Salve e volte pro dashboard
- Mostre o KPI atualizando (polling 10s)

### 6. Importacao e-SUS (3 min)

- Acesse /importacao
- Arraste o arquivo `<exemplo>.csv` para a area de upload
- Aguarde ~10s o processamento
- Veja os domicilios aparecerem no mapa
- Mostre log de erros se houver

### 7. Exportacao (2 min)

- Demonstre exportacao para XML
- Mostre que e o formato oficial do e-SUS APS PEC
- Explique a compatibilidade bidirecional
