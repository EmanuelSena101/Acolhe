# Formatos e-SUS APS — Contrato de Import/Export

> Este documento define o contrato exaustivo dos formatos aceitos pelo importador e gerados pelo exportador do Acolhe.
> Qualquer arquivo externo que respeite este contrato será importado sem alteração de código.

## Status: FINALIZADO

---

## 1. Tipos Suportados

| Código             | Descrição                        | Extensão |
| ------------------ | -------------------------------- | -------- |
| `ESUS_CSV_FICHA_A` | Cadastro Domiciliar (Ficha A)    | `.csv`   |
| `ESUS_CSV_FICHA_B` | Cadastro Individual (Ficha B)    | `.csv`   |
| `ESUS_CSV_VISITA`  | Ficha de Visita Domiciliar       | `.csv`   |
| `ESUS_XML`         | Pacote XML do e-SUS APS          | `.xml`   |
| `ESUS_ZIP`         | ZIP contendo qualquer combinação | `.zip`   |

**Auto-detecção de tipo:** quando o usuário seleciona "Auto-detectar", o sistema inspeciona:

1. Extensão do arquivo (`.xml` → XML, `.zip` → ZIP)
2. Para `.csv`: analisa o header para determinar se é Ficha A, B ou Visita com base nas colunas presentes

---

## 2. Configurações Globais

### 2.1 Encodings Aceitos

- **UTF-8** (com ou sem BOM — BOM é removido automaticamente)
- **Latin-1** (ISO 8859-1)
- **Windows-1252**

Detecção automática via `chardet`. Conversão para UTF-8 antes do parsing.

### 2.2 Separadores CSV

- `;` (padrão e-SUS)
- `,` (alternativo)

Auto-detectado por amostragem das primeiras 5 linhas (conta ocorrências de `;` e `,`, usa o mais frequente).

### 2.3 Formatos de Data Aceitos

| Formato    | Exemplo                    |
| ---------- | -------------------------- |
| DD/MM/YYYY | `25/04/2025`               |
| YYYY-MM-DD | `2025-04-25`               |
| ISO 8601   | `2025-04-25T14:30:00.000Z` |

Datas inválidas (e.g. `31/02/2025`) são rejeitadas com `severity: ERROR`.

### 2.4 Mapeamento de Colunas

- **Case-insensitive:** `CEP`, `cep`, `Cep` são todos equivalentes
- **Whitespace-tolerant:** `" cep "` é tratado como `cep`
- **Aliases aceitos:** cada coluna tem um nome canônico e aliases listados abaixo

---

## 3. Esquema CSV — Ficha A (Cadastro Domiciliar)

### 3.1 Colunas

| #   | Coluna Canônica     | Aliases                                        | Tipo    | Obrigatório | Formato / Validação                                                         | Mapeia para                |
| --- | ------------------- | ---------------------------------------------- | ------- | ----------- | --------------------------------------------------------------------------- | -------------------------- |
| 1   | `cnes`              | `cnes_ubs`, `unidade_cnes`, `cod_cnes`         | String  | Sim         | 7 dígitos numéricos; deve existir como UBS na prefeitura                    | UBS.cnes → microareaId     |
| 2   | `ine`               | `cod_ine`, `equipe_ine`, `ine_equipe`          | String  | Sim         | 10 dígitos numéricos; deve existir como EquipeESF                           | EquipeESF.ine              |
| 3   | `microarea`         | `cod_microarea`, `micro_area`, `num_microarea` | String  | Sim         | Código alfanumérico                                                         | Microarea.codigo           |
| 4   | `logradouro`        | `endereco`, `rua`, `nome_logradouro`           | String  | Sim         | Texto livre, max 200 chars                                                  | Domicilio.logradouro       |
| 5   | `numero`            | `num`, `numero_casa`, `nro`                    | String  | Sim         | Texto (aceita "S/N")                                                        | Domicilio.numero           |
| 6   | `complemento`       | `compl`, `complemento_end`                     | String  | Não         | Texto livre                                                                 | Domicilio.complemento      |
| 7   | `bairro`            | `nome_bairro`, `bairro_end`                    | String  | Sim         | Texto livre                                                                 | Domicilio.bairro           |
| 8   | `cep`               | `cod_cep`, `cep_end`                           | String  | Não         | 8 dígitos (com ou sem hífen: `01234-567` ou `01234567`)                     | Domicilio.cep              |
| 9   | `tipo`              | `tipo_domicilio`, `tp_domicilio`               | String  | Não         | `CASA`, `APARTAMENTO`, `COMODO`, `OUTRO`. Default: `CASA`                   | Domicilio.tipo             |
| 10  | `n_moradores`       | `num_moradores`, `qtd_moradores`, `moradores`  | Integer | Não         | >= 0. Default: 0                                                            | Domicilio.nMoradores       |
| 11  | `condicoes_moradia` | `cond_moradia`, `situacao_moradia`             | String  | Não         | JSON string ou valores separados por `\|`. Ex: `"agua_encanada\|esgoto"`    | Domicilio.condicoesMoradia |
| 12  | `latitude`          | `lat`, `coord_lat`                             | Float   | Não         | Decimal, range: -33.75 a 5.27 (Brasil)                                      | geocodificação             |
| 13  | `longitude`         | `lng`, `lon`, `coord_lng`, `coord_lon`         | Float   | Não         | Decimal, range: -73.99 a -34.79 (Brasil)                                    | geocodificação             |
| 14  | `external_id`       | `id_externo`, `id_esus`, `uuid_esus`           | String  | Não         | Identificador único do sistema origem. Usado para deduplicação em re-import | Domicilio.externalId       |

### 3.2 Exemplo Mínimo (Ficha A)

```csv
cnes;ine;microarea;logradouro;numero;bairro;cep;tipo;n_moradores
1234567;1234567890;001;Rua das Flores;100;Centro;13230000;CASA;4
1234567;1234567890;001;Rua das Flores;102;Centro;13230000;CASA;3
1234567;1234567890;002;Av Brasil;50;Jd Paulista;13230010;APARTAMENTO;2
```

### 3.3 Chave de Deduplicação

- Se `external_id` presente: upsert por `(microareaId, externalId)`
- Se `external_id` ausente: gera hash `SHA-256(cnes + ine + microarea + logradouro + numero)` como externalId

---

## 4. Esquema CSV — Ficha B (Cadastro Individual)

### 4.1 Colunas

| #   | Coluna Canônica | Aliases                                        | Tipo   | Obrigatório | Formato / Validação                                       | Mapeia para                            |
| --- | --------------- | ---------------------------------------------- | ------ | ----------- | --------------------------------------------------------- | -------------------------------------- |
| 1   | `cnes`          | `cnes_ubs`, `unidade_cnes`, `cod_cnes`         | String | Sim         | 7 dígitos; deve existir                                   | Localiza UBS                           |
| 2   | `ine`           | `cod_ine`, `equipe_ine`, `ine_equipe`          | String | Sim         | 10 dígitos; deve existir                                  | Localiza Equipe                        |
| 3   | `microarea`     | `cod_microarea`, `micro_area`, `num_microarea` | String | Sim         | Código alfanumérico                                       | Localiza Microarea                     |
| 4   | `logradouro`    | `endereco`, `rua`, `nome_logradouro`           | String | Sim         | Texto livre                                               | Localiza Domicílio                     |
| 5   | `numero`        | `num`, `numero_casa`, `nro`                    | String | Sim         | Texto                                                     | Localiza Domicílio                     |
| 6   | `cns`           | `cns_cidadao`, `cartao_sus`, `num_cns`         | String | Não         | 15 dígitos, validação Mod 11                              | Morador.cns                            |
| 7   | `cpf`           | `cpf_cidadao`, `num_cpf`                       | String | Não         | 11 dígitos (com ou sem pontuação)                         | Morador.cpf                            |
| 8   | `nome`          | `nome_cidadao`, `nome_completo`, `nm_cidadao`  | String | Sim         | Texto livre, max 200 chars                                | Morador.nome                           |
| 9   | `nascimento`    | `dt_nascimento`, `data_nascimento`, `dt_nasc`  | Date   | Sim         | Ver formatos de data aceitos                              | Morador.nascimento                     |
| 10  | `sexo`          | `sexo_cidadao`, `tp_sexo`                      | String | Sim         | `M`, `F`, `MASCULINO`, `FEMININO`                         | Morador.sexo (M→MASCULINO, F→FEMININO) |
| 11  | `condicoes`     | `cond_saude`, `condicoes_saude`, `problemas`   | String | Não         | Valores separados por `\|`. Ex: `"hipertensao\|diabetes"` | Morador.condicoes (JSON array)         |
| 12  | `vinculo`       | `vinculo_familiar`, `parentesco`               | String | Não         | Texto livre (ex: "Cônjuge", "Filho")                      | Morador.vinculo                        |
| 13  | `external_id`   | `id_externo`, `id_esus`, `uuid_esus`           | String | Não         | Identificador único do sistema origem                     | Morador.externalId                     |

### 4.2 Exemplo Mínimo (Ficha B)

```csv
cnes;ine;microarea;logradouro;numero;nome;nascimento;sexo;condicoes
1234567;1234567890;001;Rua das Flores;100;Maria Silva;15/03/1975;F;hipertensao|diabetes
1234567;1234567890;001;Rua das Flores;100;Jose Silva;20/08/1970;M;hipertensao
1234567;1234567890;001;Rua das Flores;102;Ana Santos;10/12/1990;F;gestante
```

### 4.3 Resolução de Domicílio

O morador é vinculado ao domicílio localizado por `(cnes → UBS, ine → Equipe, microarea → Microarea, logradouro + numero → Domicilio)`. Se o domicílio não existir, um `WARNING` é registrado e o registro é ignorado (não cria domicílio implicitamente).

### 4.4 Chave de Deduplicação

- Se `external_id` presente: upsert por `(domicilioId, externalId)`
- Se `cns` presente (e `external_id` ausente): upsert por CNS único
- Último recurso: hash `SHA-256(nome + nascimento + domicilioId)` como externalId

---

## 5. Esquema CSV — Ficha de Visita Domiciliar

### 5.1 Colunas

| #   | Coluna Canônica    | Aliases                                        | Tipo    | Obrigatório | Formato / Validação                                      | Mapeia para          |
| --- | ------------------ | ---------------------------------------------- | ------- | ----------- | -------------------------------------------------------- | -------------------- |
| 1   | `cnes`             | `cnes_ubs`, `unidade_cnes`, `cod_cnes`         | String  | Sim         | 7 dígitos; deve existir                                  | Localiza UBS         |
| 2   | `ine`              | `cod_ine`, `equipe_ine`, `ine_equipe`          | String  | Sim         | 10 dígitos; deve existir                                 | Localiza Equipe      |
| 3   | `cns_profissional` | `cns_acs`, `profissional_cns`                  | String  | Não         | 15 dígitos Mod 11. Localiza ACS                          | Visita.acsId         |
| 4   | `microarea`        | `cod_microarea`, `micro_area`, `num_microarea` | String  | Sim         | Código alfanumérico                                      | Localiza Microarea   |
| 5   | `logradouro`       | `endereco`, `rua`, `nome_logradouro`           | String  | Sim         | Texto livre                                              | Localiza Domicílio   |
| 6   | `numero`           | `num`, `numero_casa`, `nro`                    | String  | Sim         | Texto                                                    | Localiza Domicílio   |
| 7   | `data_visita`      | `dt_visita`, `data`, `data_atendimento`        | Date    | Sim         | Ver formatos de data aceitos                             | Visita.dataRealizada |
| 8   | `status`           | `situacao`, `resultado_visita`                 | String  | Não         | `REALIZADA`, `RECUSADA`, `AUSENTE`. Default: `REALIZADA` | Visita.status        |
| 9   | `motivo_recusa`    | `motivo`, `obs_recusa`                         | String  | Não         | Texto livre (obrigatório se status=RECUSADA)             | Visita.motivoRecusa  |
| 10  | `observacoes`      | `obs`, `observacao`, `anotacoes`               | String  | Não         | Texto livre                                              | Visita.observacoes   |
| 11  | `duracao_min`      | `duracao`, `tempo_min`, `tempo_visita`         | Integer | Não         | Minutos (> 0). Default: null                             | Visita.duracaoMin    |
| 12  | `latitude`         | `lat`, `coord_lat`                             | Float   | Não         | Coordenada check-in                                      | Visita.latCheckin    |
| 13  | `longitude`        | `lng`, `lon`, `coord_lng`, `coord_lon`         | Float   | Não         | Coordenada check-in                                      | Visita.lngCheckin    |
| 14  | `external_id`      | `id_externo`, `id_esus`, `uuid_esus`           | String  | Não         | Identificador único                                      | Visita.externalId    |

### 5.2 Exemplo Mínimo (Ficha de Visita)

```csv
cnes;ine;microarea;logradouro;numero;data_visita;status;observacoes
1234567;1234567890;001;Rua das Flores;100;25/04/2025;REALIZADA;Acompanhamento gestante
1234567;1234567890;001;Rua das Flores;102;25/04/2025;REALIZADA;Verificacao PA
1234567;1234567890;002;Av Brasil;50;25/04/2025;AUSENTE;Ninguem em casa
```

### 5.3 Resolução de ACS

- Se `cns_profissional` presente: localiza ACS por `ACS.usuario → Morador.cns` (ou equivalente)
- Se ausente: atribui ao ACS responsável pela microarea (`Microarea.acsId`)
- Se nenhum ACS encontrado: `WARNING`, registro importado sem ACS

### 5.4 Chave de Deduplicação

- Se `external_id` presente: upsert por `(domicilioId, externalId)`
- Senão: hash `SHA-256(domicilioId + acsId + data_visita)` como externalId

---

## 6. Esquema XML — Pacote e-SUS APS

### 6.1 Estrutura Esperada

O parser aceita XML com ou sem namespaces. Tags são buscadas de forma tolerante (ignora prefixo de namespace).

```xml
<?xml version="1.0" encoding="UTF-8"?>
<esus>
  <fichaCadastroDomiciliar>
    <cnes>1234567</cnes>
    <ine>1234567890</ine>
    <microarea>001</microarea>
    <logradouro>Rua das Flores</logradouro>
    <numero>100</numero>
    <bairro>Centro</bairro>
    <cep>13230000</cep>
    <tipo>CASA</tipo>
    <nMoradores>4</nMoradores>
    <externalId>uuid-domicilio-001</externalId>
  </fichaCadastroDomiciliar>

  <fichaCadastroIndividual>
    <cnes>1234567</cnes>
    <ine>1234567890</ine>
    <microarea>001</microarea>
    <logradouro>Rua das Flores</logradouro>
    <numero>100</numero>
    <nome>Maria Silva</nome>
    <nascimento>1975-03-15</nascimento>
    <sexo>F</sexo>
    <cns>123456789012345</cns>
    <condicoes>hipertensao|diabetes</condicoes>
    <externalId>uuid-morador-001</externalId>
  </fichaCadastroIndividual>

  <fichaVisitaDomiciliar>
    <cnes>1234567</cnes>
    <ine>1234567890</ine>
    <microarea>001</microarea>
    <logradouro>Rua das Flores</logradouro>
    <numero>100</numero>
    <dataVisita>2025-04-25</dataVisita>
    <status>REALIZADA</status>
    <observacoes>Acompanhamento gestante</observacoes>
    <externalId>uuid-visita-001</externalId>
  </fichaVisitaDomiciliar>
</esus>
```

### 6.2 Tags Aceitas

| Tag XML                     | Mapeia para | Regras                               |
| --------------------------- | ----------- | ------------------------------------ |
| `<fichaCadastroDomiciliar>` | Domicilio   | Mesmas regras da Ficha A CSV         |
| `<fichaCadastroIndividual>` | Morador     | Mesmas regras da Ficha B CSV         |
| `<fichaVisitaDomiciliar>`   | Visita      | Mesmas regras da Ficha de Visita CSV |

Cada tag-filha dentro dos elementos acima corresponde ao nome canônico da coluna CSV (camelCase aceito). A mesma política de aliases se aplica.

### 6.3 Múltiplos Registros

O XML pode conter múltiplas instâncias de cada tag, em qualquer ordem:

```xml
<esus>
  <fichaCadastroDomiciliar>...</fichaCadastroDomiciliar>
  <fichaCadastroDomiciliar>...</fichaCadastroDomiciliar>
  <fichaCadastroIndividual>...</fichaCadastroIndividual>
  <fichaVisitaDomiciliar>...</fichaVisitaDomiciliar>
  <fichaVisitaDomiciliar>...</fichaVisitaDomiciliar>
</esus>
```

---

## 7. Formato ZIP

Aceita arquivo `.zip` contendo qualquer combinação de:

- Arquivos `.csv` (cada um processado conforme detecção automática de tipo)
- Arquivos `.xml` (processados como pacote XML)

Arquivos com extensão não reconhecida dentro do ZIP são ignorados com `WARNING`.

Estrutura interna do ZIP é livre (pode ter subpastas). Todos os arquivos são encontrados recursivamente.

---

## 8. Regras de Validação

### 8.1 CNS (Cartão Nacional de Saúde)

- **Formato:** 15 dígitos numéricos
- **Validação:** Algoritmo Mod 11 oficial do Ministério da Saúde
  - CNS definitivo (início com `1` ou `2`): peso decrescente de 15 a 5, DV com tratamento de `dv=10`
  - CNS provisório (início com `7`, `8` ou `9`): soma ponderada de 15 dígitos, resto deve ser 0
- **Obrigatoriedade:** Opcional. Se presente e inválido: `severity: ERROR`

### 8.2 CEP

- **Formato:** 8 dígitos numéricos (aceita com ou sem hífen)
- **Validação:** Regex `^\d{5}-?\d{3}$` após limpeza
- **Obrigatoriedade:** Opcional. Se presente e inválido: `severity: WARNING`

### 8.3 CNES (Cadastro Nacional de Estabelecimentos de Saúde)

- **Formato:** 7 dígitos numéricos
- **Validação:** Formato + deve existir como UBS na prefeitura corrente
- **Obrigatoriedade:** Obrigatório. Se inválido ou inexistente: `severity: ERROR`, linha rejeitada

### 8.4 INE (Identificador Nacional de Equipe)

- **Formato:** 10 dígitos numéricos
- **Validação:** Formato + deve existir como EquipeESF
- **Obrigatoriedade:** Obrigatório. Se inválido ou inexistente: `severity: ERROR`, linha rejeitada

### 8.5 Datas

- Aceita DD/MM/YYYY, YYYY-MM-DD, ISO 8601
- Validação anti-rollover: `31/02/2025` → rejeitado (não aceita datas que JavaScript Date "corrige" silenciosamente)
- Se obrigatória e inválida: `severity: ERROR`
- Se opcional e inválida: `severity: WARNING`

### 8.6 Coordenadas Geográficas

- **Latitude:** range válido para Brasil: -33.75 a 5.27
- **Longitude:** range válido para Brasil: -73.99 a -34.79
- Se presentes e fora do range: `severity: WARNING` (aceita registro, mas marca como suspeito)

---

## 9. Comportamento em Caso de Erro

### 9.1 Severidades

| Severity  | Comportamento                                | Exemplos                                                                      |
| --------- | -------------------------------------------- | ----------------------------------------------------------------------------- |
| `ERROR`   | Linha rejeitada, não importada               | CNES inexistente, data obrigatória inválida, CNS inválido                     |
| `WARNING` | Linha aceita com ressalva, registrada no log | CEP inválido, coordenada fora do range, domicílio não encontrado para morador |

### 9.2 Formato do Log de Erros

Cada entrada no `ImportJob.log` (JSON array):

```json
{
  "linha": 42,
  "coluna": "cnes",
  "valor": "999",
  "erro": "CNES deve ter 7 digitos",
  "severity": "ERROR"
}
```

### 9.3 Status Final do Job

| Status                | Condição                                                                               |
| --------------------- | -------------------------------------------------------------------------------------- |
| `CONCLUIDO`           | 100% dos registros importados com sucesso                                              |
| `CONCLUIDO_COM_ERROS` | Houve falhas parciais (linhas rejeitadas)                                              |
| `ERRO`                | Arquivo inteiro inválido (formato irreconhecível, encoding corrompido, header ausente) |
| `PROCESSANDO`         | Job em andamento                                                                       |
| `PENDENTE`            | Aguardando worker                                                                      |

---

## 10. Política de Deduplicação

A importação é **idempotente**: re-importar o mesmo arquivo não duplica registros.

### 10.1 Chaves por Entidade

| Entidade  | Chave Primária de Dedup                  | Fallback (se external_id ausente)                       |
| --------- | ---------------------------------------- | ------------------------------------------------------- |
| Domicílio | `(microareaId, externalId)`              | `SHA-256(cnes + ine + microarea + logradouro + numero)` |
| Morador   | `(domicilioId, externalId)` ou CNS único | `SHA-256(nome + nascimento + domicilioId)`              |
| Visita    | `(domicilioId, externalId)`              | `SHA-256(domicilioId + acsId + data_visita)`            |

### 10.2 Comportamento de Upsert

- Se registro com mesma chave já existe: **atualiza** campos com os novos valores
- Se registro não existe: **cria** novo
- Campos opcionais ausentes no arquivo: mantêm valor existente (não sobrescrevem com null)

---

## 11. Formato de Exportação

O exportador gera arquivos no mesmo formato aceito pelo importador, garantindo round-trip.

### 11.1 Export CSV

- Encoding: UTF-8 com BOM
- Separador: `;`
- Header: usa nomes canônicos das colunas
- Datas: formato `DD/MM/YYYY`
- Gera 3 arquivos separados: `ficha_a.csv`, `ficha_b.csv`, `visitas.csv`

### 11.2 Export XML

- Encoding: UTF-8
- Estrutura idêntica ao esquema da Seção 6
- Tags em camelCase
- Inclui `externalId` (CUID do banco) para permitir re-import

### 11.3 Export ZIP

- Contém os 3 CSVs + 1 XML em um único arquivo `.zip`
- Nome: `export_<prefeitura>_<YYYY-MM-DD>.zip`

---

## 12. Notas de Compatibilidade com e-SUS APS

> O e-SUS APS oficial exporta em formatos proprietários (Thrift, PEC database dump).
> O Acolhe **não** suporta o formato Thrift — apenas CSV e XML.
>
> Para compatibilidade, o time comercial deve usar a funcionalidade de "Exportar CSV"
> do PEC, que gera arquivos compatíveis com este contrato.
>
> Decisões de design divergentes do e-SUS:
>
> - **Separador:** o e-SUS usa `;`, mas aceitamos `,` por compatibilidade com planilhas
> - **Encoding:** o e-SUS gera Latin-1, mas aceitamos UTF-8 e Windows-1252 adicionalmente
> - **Aliases:** colunas do e-SUS podem ter nomes ligeiramente diferentes entre versões; os aliases cobrem variações conhecidas
> - **Datas:** o e-SUS usa DD/MM/YYYY, mas aceitamos ISO 8601 e YYYY-MM-DD por conveniência

---

## 13. Atualização de Contadores

Durante a importação, contadores são atualizados a cada 50 registros processados:

- `ImportJob.totalLinhas` — total de registros encontrados
- `ImportJob.totalSucesso` — registros importados com sucesso
- `ImportJob.totalErro` — registros rejeitados

Isso permite polling da UI com barra de progresso em tempo real (intervalo de 2s recomendado).
