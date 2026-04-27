import { parseStringPromise } from "xml2js";
import type { CsvParseError, CsvTipo } from "./csv-parser";
import { normalizeHeader } from "./csv-parser";

export interface XmlParseResult {
  domicilios: Record<string, string>[];
  moradores: Record<string, string>[];
  visitas: Record<string, string>[];
  erros: CsvParseError[];
}

const TAG_MAP: Record<string, CsvTipo> = {
  fichacadastrodomiciliar: "ESUS_CSV_FICHA_A",
  fichacastrodomiciliar: "ESUS_CSV_FICHA_A",
  fichacadastroindividual: "ESUS_CSV_FICHA_B",
  fichavisitadomiciliar: "ESUS_CSV_VISITA",
};

const REQUIRED_FICHA_A = ["cnes", "ine", "microarea", "logradouro", "numero", "bairro"];
const REQUIRED_FICHA_B = [
  "cnes",
  "ine",
  "microarea",
  "logradouro",
  "numero",
  "nome",
  "nascimento",
  "sexo",
];
const REQUIRED_VISITA = ["cnes", "ine", "microarea", "logradouro", "numero", "data_visita"];

function camelToSnake(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

function normalizeXmlKey(key: string): string {
  const stripped = key.includes(":") ? key.split(":").pop()! : key;
  const snake = camelToSnake(stripped);
  return normalizeHeader(snake);
}

function extractText(val: unknown): string {
  if (typeof val === "string") return val.trim();
  if (Array.isArray(val)) return extractText(val[0]);
  if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, unknown>;
    if ("_" in obj) return String(obj._).trim();
    if ("$t" in obj) return String(obj.$t).trim();
  }
  return String(val ?? "").trim();
}

function processElement(
  element: Record<string, unknown>,
  requiredCols: string[],
  tipo: string,
  index: number,
  erros: CsvParseError[],
): Record<string, string> | null {
  const record: Record<string, string> = {};

  for (const [rawKey, rawVal] of Object.entries(element)) {
    if (rawKey === "$" || rawKey === "$$") continue;
    const normalizedKey = normalizeXmlKey(rawKey);
    record[normalizedKey] = extractText(rawVal);
  }

  let hasError = false;
  for (const col of requiredCols) {
    if (!record[col]) {
      erros.push({
        linha: index + 1,
        coluna: col,
        valor: "",
        erro: `Campo obrigatorio '${col}' ausente no elemento ${tipo} #${index + 1}`,
        severity: "ERROR",
      });
      hasError = true;
    }
  }

  return hasError ? null : record;
}

export async function parseXML(content: string): Promise<XmlParseResult> {
  const erros: CsvParseError[] = [];
  const domicilios: Record<string, string>[] = [];
  const moradores: Record<string, string>[] = [];
  const visitas: Record<string, string>[] = [];

  let parsed: Record<string, unknown>;
  try {
    parsed = await parseStringPromise(content, {
      explicitArray: true,
      ignoreAttrs: false,
    });
  } catch (e) {
    erros.push({
      linha: 1,
      coluna: "",
      valor: "",
      erro: `Erro ao parsear XML: ${e instanceof Error ? e.message : String(e)}`,
      severity: "ERROR",
    });
    return { domicilios, moradores, visitas, erros };
  }

  if (!parsed) {
    erros.push({
      linha: 1,
      coluna: "",
      valor: "",
      erro: "XML vazio ou sem conteudo",
      severity: "ERROR",
    });
    return { domicilios, moradores, visitas, erros };
  }

  const root = (parsed.esus ?? parsed.Esus ?? parsed.ESUS ?? Object.values(parsed)[0]) as
    | Record<string, unknown[]>
    | undefined;

  if (!root || typeof root !== "object") {
    erros.push({
      linha: 1,
      coluna: "",
      valor: "",
      erro: "Elemento raiz do XML nao encontrado",
      severity: "ERROR",
    });
    return { domicilios, moradores, visitas, erros };
  }

  for (const [tagName, elements] of Object.entries(root)) {
    const normalizedTag = tagName.toLowerCase().replace(/[^a-z]/g, "");
    const tipo = TAG_MAP[normalizedTag];
    if (!tipo || !Array.isArray(elements)) continue;

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i] as Record<string, unknown>;
      if (!element || typeof element !== "object") continue;

      switch (tipo) {
        case "ESUS_CSV_FICHA_A": {
          const rec = processElement(
            element,
            REQUIRED_FICHA_A,
            "fichaCadastroDomiciliar",
            i,
            erros,
          );
          if (rec) domicilios.push(rec);
          break;
        }
        case "ESUS_CSV_FICHA_B": {
          const rec = processElement(
            element,
            REQUIRED_FICHA_B,
            "fichaCadastroIndividual",
            i,
            erros,
          );
          if (rec) moradores.push(rec);
          break;
        }
        case "ESUS_CSV_VISITA": {
          const rec = processElement(element, REQUIRED_VISITA, "fichaVisitaDomiciliar", i, erros);
          if (rec) visitas.push(rec);
          break;
        }
      }
    }
  }

  return { domicilios, moradores, visitas, erros };
}
