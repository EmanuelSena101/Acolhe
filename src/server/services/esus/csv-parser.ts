import Papa from "papaparse";

export type CsvTipo = "ESUS_CSV_FICHA_A" | "ESUS_CSV_FICHA_B" | "ESUS_CSV_VISITA";

export interface CsvParseError {
  linha: number;
  coluna: string;
  valor: string;
  erro: string;
  severity: "ERROR" | "WARNING";
}

export interface CsvParseResult {
  tipo: CsvTipo;
  registros: Record<string, string>[];
  erros: CsvParseError[];
  totalLinhas: number;
}

const ALIAS_MAP: Record<string, string> = {
  // Ficha A
  cnes_ubs: "cnes",
  unidade_cnes: "cnes",
  cod_cnes: "cnes",
  cod_ine: "ine",
  equipe_ine: "ine",
  ine_equipe: "ine",
  cod_microarea: "microarea",
  micro_area: "microarea",
  num_microarea: "microarea",
  endereco: "logradouro",
  rua: "logradouro",
  nome_logradouro: "logradouro",
  num: "numero",
  numero_casa: "numero",
  nro: "numero",
  compl: "complemento",
  complemento_end: "complemento",
  nome_bairro: "bairro",
  bairro_end: "bairro",
  cod_cep: "cep",
  cep_end: "cep",
  tipo_domicilio: "tipo",
  tp_domicilio: "tipo",
  num_moradores: "n_moradores",
  qtd_moradores: "n_moradores",
  moradores: "n_moradores",
  cond_moradia: "condicoes_moradia",
  situacao_moradia: "condicoes_moradia",
  lat: "latitude",
  coord_lat: "latitude",
  lng: "longitude",
  lon: "longitude",
  coord_lng: "longitude",
  coord_lon: "longitude",
  id_externo: "external_id",
  id_esus: "external_id",
  uuid_esus: "external_id",

  // Ficha B
  cns_cidadao: "cns",
  cartao_sus: "cns",
  num_cns: "cns",
  cpf_cidadao: "cpf",
  num_cpf: "cpf",
  nome_cidadao: "nome",
  nome_completo: "nome",
  nm_cidadao: "nome",
  dt_nascimento: "nascimento",
  data_nascimento: "nascimento",
  dt_nasc: "nascimento",
  sexo_cidadao: "sexo",
  tp_sexo: "sexo",
  cond_saude: "condicoes",
  condicoes_saude: "condicoes",
  problemas: "condicoes",
  vinculo_familiar: "vinculo",
  parentesco: "vinculo",

  // Ficha Visita
  cns_acs: "cns_profissional",
  profissional_cns: "cns_profissional",
  dt_visita: "data_visita",
  data: "data_visita",
  data_atendimento: "data_visita",
  situacao: "status",
  resultado_visita: "status",
  motivo: "motivo_recusa",
  obs_recusa: "motivo_recusa",
  obs: "observacoes",
  observacao: "observacoes",
  anotacoes: "observacoes",
  duracao: "duracao_min",
  tempo_min: "duracao_min",
  tempo_visita: "duracao_min",
};

const FICHA_A_COLUMNS = new Set([
  "cnes",
  "ine",
  "microarea",
  "logradouro",
  "numero",
  "complemento",
  "bairro",
  "cep",
  "tipo",
  "n_moradores",
  "condicoes_moradia",
  "latitude",
  "longitude",
  "external_id",
]);

const FICHA_B_COLUMNS = new Set([
  "cnes",
  "ine",
  "microarea",
  "logradouro",
  "numero",
  "cns",
  "cpf",
  "nome",
  "nascimento",
  "sexo",
  "condicoes",
  "vinculo",
  "external_id",
]);

const FICHA_VISITA_COLUMNS = new Set([
  "cnes",
  "ine",
  "cns_profissional",
  "microarea",
  "logradouro",
  "numero",
  "data_visita",
  "status",
  "motivo_recusa",
  "observacoes",
  "duracao_min",
  "latitude",
  "longitude",
  "external_id",
]);

export function detectSeparator(content: string): ";" | "," {
  const lines = content.split("\n").slice(0, 5);
  let semicolons = 0;
  let commas = 0;
  for (const line of lines) {
    semicolons += (line.match(/;/g) ?? []).length;
    commas += (line.match(/,/g) ?? []).length;
  }
  return semicolons >= commas ? ";" : ",";
}

export function removeBOM(content: string): string {
  if (content.charCodeAt(0) === 0xfeff) {
    return content.slice(1);
  }
  return content;
}

export function normalizeHeader(header: string): string {
  const trimmed = header.trim().toLowerCase().replace(/\s+/g, "_");
  return ALIAS_MAP[trimmed] ?? trimmed;
}

export function detectTipo(headers: string[]): CsvTipo {
  const normalized = new Set(headers.map(normalizeHeader));

  const fichaB_specific = ["nome", "nascimento", "sexo"];
  const fichaVisita_specific = ["data_visita"];
  const fichaA_specific = ["bairro", "n_moradores", "condicoes_moradia"];

  if (fichaVisita_specific.some((h) => normalized.has(h))) {
    return "ESUS_CSV_VISITA";
  }
  if (fichaB_specific.every((h) => normalized.has(h))) {
    return "ESUS_CSV_FICHA_B";
  }
  if (fichaA_specific.some((h) => normalized.has(h))) {
    return "ESUS_CSV_FICHA_A";
  }

  return "ESUS_CSV_FICHA_A";
}

export function getRequiredColumns(tipo: CsvTipo): string[] {
  switch (tipo) {
    case "ESUS_CSV_FICHA_A":
      return ["cnes", "ine", "microarea", "logradouro", "numero", "bairro"];
    case "ESUS_CSV_FICHA_B":
      return ["cnes", "ine", "microarea", "logradouro", "numero", "nome", "nascimento", "sexo"];
    case "ESUS_CSV_VISITA":
      return ["cnes", "ine", "microarea", "logradouro", "numero", "data_visita"];
  }
}

export function getValidColumns(tipo: CsvTipo): Set<string> {
  switch (tipo) {
    case "ESUS_CSV_FICHA_A":
      return FICHA_A_COLUMNS;
    case "ESUS_CSV_FICHA_B":
      return FICHA_B_COLUMNS;
    case "ESUS_CSV_VISITA":
      return FICHA_VISITA_COLUMNS;
  }
}

export function parseCSV(content: string, tipoOverride?: CsvTipo): CsvParseResult {
  const cleaned = removeBOM(content);
  const separator = detectSeparator(cleaned);

  const parsed = Papa.parse<string[]>(cleaned, {
    delimiter: separator,
    header: false,
    skipEmptyLines: true,
  });

  if (parsed.data.length === 0) {
    return { tipo: tipoOverride ?? "ESUS_CSV_FICHA_A", registros: [], erros: [], totalLinhas: 0 };
  }

  const rawHeaders = parsed.data[0];
  const normalizedHeaders = rawHeaders.map(normalizeHeader);
  const tipo = tipoOverride ?? detectTipo(rawHeaders);
  const required = getRequiredColumns(tipo);

  const erros: CsvParseError[] = [];
  const registros: Record<string, string>[] = [];

  const missingRequired = required.filter((col) => !normalizedHeaders.includes(col));
  if (missingRequired.length > 0) {
    erros.push({
      linha: 1,
      coluna: missingRequired.join(", "),
      valor: "",
      erro: `Colunas obrigatorias ausentes no header: ${missingRequired.join(", ")}`,
      severity: "ERROR",
    });
    return { tipo, registros: [], erros, totalLinhas: 0 };
  }

  const dataRows = parsed.data.slice(1);

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const linhaNum = i + 2;
    const record: Record<string, string> = {};
    let rowHasError = false;

    for (let j = 0; j < normalizedHeaders.length; j++) {
      const col = normalizedHeaders[j];
      const val = (row[j] ?? "").trim();
      record[col] = val;
    }

    for (const col of required) {
      if (!record[col]) {
        erros.push({
          linha: linhaNum,
          coluna: col,
          valor: "",
          erro: `Campo obrigatorio '${col}' vazio`,
          severity: "ERROR",
        });
        rowHasError = true;
      }
    }

    if (!rowHasError) {
      registros.push(record);
    }
  }

  return { tipo, registros, erros, totalLinhas: dataRows.length };
}
