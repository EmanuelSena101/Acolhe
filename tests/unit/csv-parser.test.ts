import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  parseCSV,
  detectSeparator,
  removeBOM,
  normalizeHeader,
  detectTipo,
  getRequiredColumns,
} from "@/server/services/esus/csv-parser";

const fixturesDir = resolve(__dirname, "../fixtures");

describe("detectSeparator", () => {
  it("detecta ; como separador quando predominante", () => {
    const content = "cnes;ine;microarea\n1234567;1234567890;001";
    expect(detectSeparator(content)).toBe(";");
  });

  it("detecta , como separador quando predominante", () => {
    const content = "cnes,ine,microarea\n1234567,1234567890,001";
    expect(detectSeparator(content)).toBe(",");
  });

  it("usa ; como padrao quando empate", () => {
    const content = "cnes\n1234567";
    expect(detectSeparator(content)).toBe(";");
  });

  it("analisa ate 5 linhas", () => {
    const lines = [
      "a;b;c",
      "1;2;3",
      "4;5;6",
      "7;8;9",
      "10;11;12",
      "13,14,15", // 6th line, not sampled
    ];
    expect(detectSeparator(lines.join("\n"))).toBe(";");
  });
});

describe("removeBOM", () => {
  it("remove UTF-8 BOM", () => {
    const withBOM = "\uFEFFcnes;ine";
    expect(removeBOM(withBOM)).toBe("cnes;ine");
  });

  it("retorna string sem alteracao se nao tem BOM", () => {
    const noBOM = "cnes;ine";
    expect(removeBOM(noBOM)).toBe("cnes;ine");
  });
});

describe("normalizeHeader", () => {
  it("converte para lowercase", () => {
    expect(normalizeHeader("CNES")).toBe("cnes");
  });

  it("remove espacos em branco", () => {
    expect(normalizeHeader("  cep  ")).toBe("cep");
  });

  it("resolve alias cnes_ubs para cnes", () => {
    expect(normalizeHeader("cnes_ubs")).toBe("cnes");
  });

  it("resolve alias unidade_cnes para cnes", () => {
    expect(normalizeHeader("UNIDADE_CNES")).toBe("cnes");
  });

  it("resolve alias cod_ine para ine", () => {
    expect(normalizeHeader("cod_ine")).toBe("ine");
  });

  it("resolve alias endereco para logradouro", () => {
    expect(normalizeHeader("endereco")).toBe("logradouro");
  });

  it("resolve alias rua para logradouro", () => {
    expect(normalizeHeader("rua")).toBe("logradouro");
  });

  it("resolve alias num para numero", () => {
    expect(normalizeHeader("num")).toBe("numero");
  });

  it("resolve alias dt_nascimento para nascimento", () => {
    expect(normalizeHeader("dt_nascimento")).toBe("nascimento");
  });

  it("resolve alias dt_visita para data_visita", () => {
    expect(normalizeHeader("dt_visita")).toBe("data_visita");
  });

  it("resolve alias lat para latitude", () => {
    expect(normalizeHeader("lat")).toBe("latitude");
  });

  it("resolve alias id_externo para external_id", () => {
    expect(normalizeHeader("id_externo")).toBe("external_id");
  });

  it("mantem coluna desconhecida como esta", () => {
    expect(normalizeHeader("coluna_custom")).toBe("coluna_custom");
  });

  it("trata espacos multiplos como underscore e resolve alias", () => {
    // "  cod  cep  " → "cod_cep" → alias resolves to "cep"
    expect(normalizeHeader("  cod  cep  ")).toBe("cep");
  });
});

describe("detectTipo", () => {
  it("detecta Ficha A por bairro", () => {
    const headers = ["cnes", "ine", "microarea", "logradouro", "numero", "bairro"];
    expect(detectTipo(headers)).toBe("ESUS_CSV_FICHA_A");
  });

  it("detecta Ficha B por nome + nascimento + sexo", () => {
    const headers = [
      "cnes",
      "ine",
      "microarea",
      "logradouro",
      "numero",
      "nome",
      "nascimento",
      "sexo",
    ];
    expect(detectTipo(headers)).toBe("ESUS_CSV_FICHA_B");
  });

  it("detecta Ficha Visita por data_visita", () => {
    const headers = ["cnes", "ine", "microarea", "logradouro", "numero", "data_visita"];
    expect(detectTipo(headers)).toBe("ESUS_CSV_VISITA");
  });

  it("detecta Ficha Visita mesmo com alias dt_visita", () => {
    const headers = ["cnes", "ine", "microarea", "logradouro", "numero", "dt_visita"];
    expect(detectTipo(headers)).toBe("ESUS_CSV_VISITA");
  });

  it("default para Ficha A se ambiguo", () => {
    const headers = ["cnes", "ine", "microarea"];
    expect(detectTipo(headers)).toBe("ESUS_CSV_FICHA_A");
  });
});

describe("getRequiredColumns", () => {
  it("retorna colunas obrigatorias para Ficha A", () => {
    const required = getRequiredColumns("ESUS_CSV_FICHA_A");
    expect(required).toContain("cnes");
    expect(required).toContain("bairro");
    expect(required).not.toContain("cep");
  });

  it("retorna colunas obrigatorias para Ficha B", () => {
    const required = getRequiredColumns("ESUS_CSV_FICHA_B");
    expect(required).toContain("nome");
    expect(required).toContain("nascimento");
    expect(required).toContain("sexo");
  });

  it("retorna colunas obrigatorias para Ficha Visita", () => {
    const required = getRequiredColumns("ESUS_CSV_VISITA");
    expect(required).toContain("data_visita");
    expect(required).not.toContain("status");
  });
});

describe("parseCSV", () => {
  it("parseia Ficha A valida corretamente", () => {
    const content = readFileSync(resolve(fixturesDir, "ficha-a-valida.csv"), "utf-8");
    const result = parseCSV(content);

    expect(result.tipo).toBe("ESUS_CSV_FICHA_A");
    expect(result.totalLinhas).toBe(5);
    expect(result.registros).toHaveLength(5);
    expect(result.erros).toHaveLength(0);
    expect(result.registros[0].logradouro).toBe("Rua das Flores");
    expect(result.registros[0].cnes).toBe("1234567");
  });

  it("parseia Ficha A com erros — 3 sucesso, 2 erros", () => {
    const content = readFileSync(resolve(fixturesDir, "ficha-a-com-erros.csv"), "utf-8");
    const result = parseCSV(content);

    expect(result.tipo).toBe("ESUS_CSV_FICHA_A");
    expect(result.totalLinhas).toBe(5);
    expect(result.registros).toHaveLength(3);
    expect(result.erros.length).toBeGreaterThan(0);
    expect(result.erros.some((e) => e.severity === "ERROR")).toBe(true);
  });

  it("aceita separador virgula", () => {
    const content =
      "cnes,ine,microarea,logradouro,numero,bairro\n1234567,1234567890,001,Rua X,10,Centro";
    const result = parseCSV(content);

    expect(result.registros).toHaveLength(1);
    expect(result.registros[0].logradouro).toBe("Rua X");
  });

  it("remove BOM e parseia corretamente", () => {
    const content =
      "\uFEFFcnes;ine;microarea;logradouro;numero;bairro\n1234567;1234567890;001;Rua Y;20;Vila";
    const result = parseCSV(content);

    expect(result.registros).toHaveLength(1);
    expect(result.registros[0].bairro).toBe("Vila");
  });

  it("normaliza headers com aliases", () => {
    const content =
      "CNES_UBS;COD_INE;COD_MICROAREA;ENDERECO;NRO;NOME_BAIRRO\n1234567;1234567890;001;Rua Z;30;Jd";
    const result = parseCSV(content);

    expect(result.registros).toHaveLength(1);
    expect(result.registros[0].cnes).toBe("1234567");
    expect(result.registros[0].logradouro).toBe("Rua Z");
    expect(result.registros[0].bairro).toBe("Jd");
  });

  it("normaliza headers com espacos", () => {
    const content =
      " CNES ; INE ; MICROAREA ; LOGRADOURO ; NUMERO ; BAIRRO \n1234567;1234567890;001;Rua W;40;Sol";
    const result = parseCSV(content);

    expect(result.registros).toHaveLength(1);
  });

  it("retorna erro se header obrigatorio ausente", () => {
    const content = "cnes;ine;microarea\n1234567;1234567890;001";
    const result = parseCSV(content);

    expect(result.registros).toHaveLength(0);
    expect(result.erros).toHaveLength(1);
    expect(result.erros[0].erro).toContain("Colunas obrigatorias ausentes");
    expect(result.erros[0].severity).toBe("ERROR");
  });

  it("retorna resultado vazio para conteudo vazio", () => {
    const result = parseCSV("");

    expect(result.registros).toHaveLength(0);
    expect(result.totalLinhas).toBe(0);
  });

  it("respeita tipo override", () => {
    const content =
      "cnes;ine;microarea;logradouro;numero;bairro;data_visita\n1234567;1234567890;001;Rua X;10;Centro;25/04/2025";
    const result = parseCSV(content, "ESUS_CSV_FICHA_A");

    expect(result.tipo).toBe("ESUS_CSV_FICHA_A");
  });

  it("detecta automaticamente Ficha B", () => {
    const content =
      "cnes;ine;microarea;logradouro;numero;nome;nascimento;sexo\n1234567;1234567890;001;Rua X;10;Maria;15/03/1975;F";
    const result = parseCSV(content);

    expect(result.tipo).toBe("ESUS_CSV_FICHA_B");
    expect(result.registros).toHaveLength(1);
    expect(result.registros[0].nome).toBe("Maria");
  });

  it("detecta automaticamente Ficha Visita", () => {
    const content =
      "cnes;ine;microarea;logradouro;numero;data_visita;status\n1234567;1234567890;001;Rua X;10;25/04/2025;REALIZADA";
    const result = parseCSV(content);

    expect(result.tipo).toBe("ESUS_CSV_VISITA");
    expect(result.registros).toHaveLength(1);
    expect(result.registros[0].data_visita).toBe("25/04/2025");
  });

  it("marca erro por linha quando campo obrigatorio vazio", () => {
    const content = "cnes;ine;microarea;logradouro;numero;bairro\n;1234567890;001;Rua X;10;Centro";
    const result = parseCSV(content);

    expect(result.registros).toHaveLength(0);
    expect(result.erros).toHaveLength(1);
    expect(result.erros[0].linha).toBe(2);
    expect(result.erros[0].coluna).toBe("cnes");
    expect(result.erros[0].severity).toBe("ERROR");
  });

  it("ignora linhas vazias", () => {
    const content =
      "cnes;ine;microarea;logradouro;numero;bairro\n1234567;1234567890;001;Rua X;10;Centro\n\n";
    const result = parseCSV(content);

    expect(result.registros).toHaveLength(1);
    expect(result.totalLinhas).toBe(1);
  });

  it("preserva campos opcionais quando presentes", () => {
    const content =
      "cnes;ine;microarea;logradouro;numero;bairro;cep;complemento;external_id\n1234567;1234567890;001;Rua X;10;Centro;13230000;Apt 1;ext-001";
    const result = parseCSV(content);

    expect(result.registros[0].cep).toBe("13230000");
    expect(result.registros[0].complemento).toBe("Apt 1");
    expect(result.registros[0].external_id).toBe("ext-001");
  });
});
